const SdpTransform = require("sdp-transform");
const BrowserRtpCapabilities = require("../lib/BrowserRtpCapabilities");
const SdpUtils = require("../lib/SdpUtils");
const { createClientOffer, createPlanBOffer } = require("./helpers/sdpSamples");

describe("SdpUtils", () => {
  const routerCaps = BrowserRtpCapabilities.chrome;

  function parseOffer() {
    return SdpTransform.parse(createClientOffer());
  }

  test("sdpToProducerRtpParameters extracts audio encodings with cname", () => {
    const params = SdpUtils.sdpToProducerRtpParameters(
      parseOffer(),
      routerCaps,
      "audio",
    );

    expect(params.mid).toBe("0");
    expect(params.codecs.some((codec) => codec.mimeType === "audio/opus")).toBe(
      true,
    );
    expect(params.encodings).toHaveLength(1);
    expect(params.encodings[0]).toHaveProperty("ssrc", 1111111);
    expect(params.rtcp).toEqual(
      expect.objectContaining({
        cname: "audio-cname",
        reducedSize: true,
        mux: true,
      }),
    );
  });

  test("sdpToProducerRtpParameters preserves remote RTX payload types for video", () => {
    const params = SdpUtils.sdpToProducerRtpParameters(
      parseOffer(),
      routerCaps,
      "video",
    );

    const rtxCodec = params.codecs.find(
      (codec) => codec.mimeType && codec.mimeType.toLowerCase() === "video/rtx",
    );

    expect(rtxCodec).toBeDefined();
    expect(rtxCodec.parameters).toEqual(expect.objectContaining({ apt: 96 }));
    expect(rtxCodec.payloadType).toBe(97);
    const headerExts = params.headerExtensions || [];
    expect(headerExts.every((ext) => ext.kind === "video")).toBe(true);
  });

  test("sdpToConsumerRtpCapabilities produces recv caps that include opus", () => {
    const consumerCaps = SdpUtils.sdpToConsumerRtpCapabilities(
      parseOffer(),
      routerCaps,
    );

    expect(
      consumerCaps.codecs?.some((codec) => codec.mimeType === "audio/opus"),
    ).toBe(true);
  });

  test("sdpToProducerRtpParameters falls back to default mids with Plan B SDP", () => {
    const planBOffer = SdpTransform.parse(createPlanBOffer());

    const params = SdpUtils.sdpToProducerRtpParameters(
      planBOffer,
      routerCaps,
      "video",
    );

    expect(params.mid).toBe("1");
    expect(params.encodings).toHaveLength(1);
    expect(params.encodings[0]).toEqual(
      expect.objectContaining({
        ssrc: 5555555,
        rtx: expect.objectContaining({ ssrc: 6666666 }),
      }),
    );
  });
});
