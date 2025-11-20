const BrowserRtpCapabilities = require("../lib/BrowserRtpCapabilities");
const { createSdpEndpoint } = require("../lib/index");
const {
  createClientAnswer,
  createDataChannelOffer,
} = require("./helpers/sdpSamples");

function createMockTransport() {
  const connect = jest.fn(async () => {});
  const produce = jest.fn(async ({ kind, rtpParameters }) => ({
    id: `${kind}-producer`,
    kind,
    type: "simple",
    paused: false,
    rtpParameters,
  }));

  return {
    iceParameters: {
      usernameFragment: "mockufrag",
      password: "mockpwd",
    },
    iceCandidates: [
      {
        foundation: "foundation",
        priority: 12345,
        address: "127.0.0.1",
        ip: "127.0.0.1",
        protocol: "udp",
        port: 3478,
        type: "host",
      },
    ],
    dtlsParameters: {
      role: "auto",
      fingerprints: [
        {
          algorithm: "sha-256",
          value: "AA:BB:CC:DD:EE:FF",
        },
      ],
    },
    sctpParameters: undefined,
    connect,
    produce,
  };
}

function createConsumer(kind) {
  const isAudio = kind === "audio";

  return {
    kind,
    rtpParameters: {
      mid: isAudio ? "0" : "1",
      codecs: [
        isAudio
          ? {
              mimeType: "audio/opus",
              payloadType: 111,
              clockRate: 48000,
              channels: 2,
              parameters: {},
              rtcpFeedback: [],
            }
          : {
              mimeType: "video/VP8",
              payloadType: 96,
              clockRate: 90000,
              parameters: {},
              rtcpFeedback: [],
            },
      ],
      headerExtensions: [],
      encodings: [
        {
          ssrc: isAudio ? 4444444 : 5555555,
        },
      ],
      rtcp: {
        cname: `${kind}-consumer`,
        reducedSize: true,
        mux: true,
      },
    },
  };
}

beforeEach(() => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("SdpEndpoint receiving media", () => {
  test("processOffer wires up mediasoup Producers and ignores data channel m-lines", async () => {
    const transport = createMockTransport();
    const endpoint = createSdpEndpoint(
      transport,
      BrowserRtpCapabilities.chrome,
    );

    const producers = await endpoint.processOffer(createDataChannelOffer());

    expect(transport.connect).toHaveBeenCalledTimes(1);
    expect(transport.produce).toHaveBeenCalledTimes(2);
    expect(producers).toHaveLength(2);

    const answer = endpoint.createAnswer();

    expect(answer).toContain("m=audio");
    expect(answer).toContain("m=video");
    expect(answer).not.toContain("m=application");
    const recvOnlyMatches = answer.match(/a=recvonly/g) || [];

    expect(recvOnlyMatches.length).toBeGreaterThanOrEqual(2);
  });
});

describe("SdpEndpoint sending media", () => {
  test("createOffer builds sendonly sections for registered consumers and processAnswer connects DTLS", async () => {
    const transport = createMockTransport();
    const endpoint = createSdpEndpoint(
      transport,
      BrowserRtpCapabilities.chrome,
    );

    endpoint.addConsumer(createConsumer("audio"));
    endpoint.addConsumer(createConsumer("video"));

    const offer = endpoint.createOffer();

    expect(offer).toContain("a=sendonly");
    const msidMatches = offer.match(/a=msid:/g) || [];

    expect(msidMatches.length).toBeGreaterThanOrEqual(2);

    await endpoint.processAnswer(createClientAnswer());

    expect(transport.connect).toHaveBeenCalledTimes(1);
  });
});
