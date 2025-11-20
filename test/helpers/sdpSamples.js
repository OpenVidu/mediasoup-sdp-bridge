const ICE_UFRAG = "auditufrag";
const ICE_PWD = "auditpwd12345678901234567890";
const FINGERPRINT =
  "AA:BB:CC:DD:EE:FF:AA:BB:CC:DD:EE:FF:AA:BB:CC:DD:EE:FF:AA:BB:CC:DD:EE:FF:AA:BB:CC:DD:EE:FF";

function linesToSdp(lines) {
  return `${lines.map((line) => line.trim()).join("\r\n")}\r\n`;
}

function baseHeader({ origin, bundle }) {
  const header = [
    "v=0",
    `${origin}`,
    "s=-",
    "t=0 0",
    "a=msid-semantic: WMS mediasoup-stream",
  ];

  if (bundle) {
    header.push(bundle);
  }

  return header;
}

function mediaSection({ kind, direction, mid, extraLines, includeMid = true }) {
  const base = [
    `m=${kind} 9 UDP/TLS/RTP/SAVPF ${kind === "audio" ? "111 63" : "96 97"}`,
    "c=IN IP4 0.0.0.0",
    "a=rtcp:9 IN IP4 0.0.0.0",
    `a=ice-ufrag:${ICE_UFRAG}`,
    `a=ice-pwd:${ICE_PWD}`,
    `a=fingerprint:sha-256 ${FINGERPRINT}`,
    `a=setup:${direction === "sendonly" ? "actpass" : "active"}`,
    includeMid ? `a=mid:${mid}` : null,
    `a=${direction}`,
    `a=msid:mediasoup-stream ${kind}-track`,
    "a=rtcp-mux",
    "a=rtcp-rsize",
  ].filter(Boolean);

  return base.concat(extraLines);
}

function applicationSection({ mid }) {
  return [
    "m=application 9 DTLS/SCTP 5000",
    "c=IN IP4 0.0.0.0",
    `a=ice-ufrag:${ICE_UFRAG}`,
    `a=ice-pwd:${ICE_PWD}`,
    `a=fingerprint:sha-256 ${FINGERPRINT}`,
    "a=setup:actpass",
    `a=mid:${mid}`,
    "a=sctp-port:5000",
    "a=max-message-size:262144",
  ];
}

function createUnifiedPlanOffer() {
  const header = baseHeader({
    origin: "o=mediasoup-client 9999999999 2 IN IP4 127.0.0.1",
  });

  const audioExtra = [
    "a=rtpmap:111 opus/48000/2",
    "a=fmtp:111 minptime=10;useinbandfec=1",
    "a=rtpmap:63 red/48000/2",
    "a=rtcp-fb:111 transport-cc",
    "a=ssrc:1111111 cname:audio-cname",
    "a=ssrc:1111111 msid:mediasoup-stream audio-track",
  ];

  const videoExtra = [
    "a=rtpmap:96 VP8/90000",
    "a=rtpmap:97 rtx/90000",
    "a=fmtp:97 apt=96",
    "a=rtcp-fb:96 nack",
    "a=rtcp-fb:96 nack pli",
    "a=rtcp-fb:96 ccm fir",
    "a=ssrc:2222222 cname:video-cname",
    "a=ssrc:2222222 msid:mediasoup-stream video-track",
  ];

  const sdpLines = header
    .concat(
      mediaSection({
        kind: "audio",
        direction: "sendonly",
        mid: "0",
        extraLines: audioExtra,
      }),
    )
    .concat(
      mediaSection({
        kind: "video",
        direction: "sendonly",
        mid: "1",
        extraLines: videoExtra,
      }),
    );

  return linesToSdp(sdpLines);
}

function createUnifiedPlanAnswer() {
  const header = baseHeader({
    origin: "o=mediasoup-peer 555555 3 IN IP4 127.0.0.1",
  });

  const recvOnlyExtras = (kind) => [
    kind === "audio" ? "a=rtpmap:111 opus/48000/2" : "a=rtpmap:96 VP8/90000",
    kind === "audio" ? "a=rtcp-fb:111 transport-cc" : "a=rtcp-fb:96 nack",
    kind === "audio"
      ? "a=ssrc:3333333 cname:answer-audio"
      : "a=ssrc:4444444 cname:answer-video",
  ];

  const sdpLines = header
    .concat(
      mediaSection({
        kind: "audio",
        direction: "recvonly",
        mid: "0",
        extraLines: recvOnlyExtras("audio"),
      }),
    )
    .concat(
      mediaSection({
        kind: "video",
        direction: "recvonly",
        mid: "1",
        extraLines: recvOnlyExtras("video"),
      }),
    );

  return linesToSdp(sdpLines);
}

function createPlanBOffer() {
  const header = baseHeader({
    origin: "o=planb-peer 777777 2 IN IP4 192.168.1.10",
    bundle: "a=group:BUNDLE audio video",
  });

  const audioExtra = [
    "a=rtpmap:111 opus/48000/2",
    "a=ssrc:1111111 cname:planb-audio",
    "a=ssrc:1111111 msid:stream audio",
  ];

  const videoExtra = [
    "a=rtpmap:96 VP8/90000",
    "a=rtcp-fb:96 nack",
    "a=ssrc:5555555 cname:planb-video",
    "a=ssrc:5555555 msid:stream video",
    "a=ssrc:6666666 cname:planb-video",
    "a=ssrc:6666666 msid:stream video",
    "a=ssrc-group:FID 5555555 6666666",
  ];

  const sdpLines = header
    .concat(
      mediaSection({
        kind: "audio",
        direction: "sendonly",
        mid: "audio",
        includeMid: false,
        extraLines: audioExtra,
      }),
    )
    .concat(
      mediaSection({
        kind: "video",
        direction: "sendonly",
        mid: "video",
        includeMid: false,
        extraLines: videoExtra,
      }),
    );

  return linesToSdp(sdpLines);
}

function createDataChannelOffer() {
  const header = baseHeader({ origin: "o=data-peer 888888 2 IN IP4 10.0.0.5" });

  const audioExtra = [
    "a=rtpmap:111 opus/48000/2",
    "a=ssrc:9999999 cname:data-audio",
    "a=ssrc:9999999 msid:stream audio-track",
  ];

  const videoExtra = [
    "a=rtpmap:96 VP8/90000",
    "a=ssrc:7777777 cname:data-video",
    "a=ssrc:7777777 msid:stream video-track",
  ];

  const sdpLines = header
    .concat(
      mediaSection({
        kind: "audio",
        direction: "sendonly",
        mid: "0",
        extraLines: audioExtra,
      }),
    )
    .concat(
      mediaSection({
        kind: "video",
        direction: "sendonly",
        mid: "1",
        extraLines: videoExtra,
      }),
    )
    .concat(applicationSection({ mid: "data" }));

  return linesToSdp(sdpLines);
}

module.exports = {
  createClientOffer: createUnifiedPlanOffer,
  createClientAnswer: createUnifiedPlanAnswer,
  createUnifiedPlanOffer,
  createUnifiedPlanAnswer,
  createPlanBOffer,
  createDataChannelOffer,
};
