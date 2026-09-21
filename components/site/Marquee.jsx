/**
 * A running band of the things taught here, in German whatever the reading
 * language — the words are the subject, not the interface.
 *
 * The list is rendered twice and the track travels exactly half its width, so
 * the second copy arrives where the first began and the loop never shows a seam.
 */
const WORDS = [
  "A1", "A2", "B1", "B2", "C1",
  "GRAMMATIK", "WORTSCHATZ", "KONVERSATION", "AUSSPRACHE",
  "HÖRVERSTEHEN", "LESEVERSTEHEN", "SCHREIBEN", "SPRECHEN",
  "LIVE-UNTERRICHT", "KLEINE GRUPPEN", "HAUSAUFGABEN",
  "EINSTUFUNGSTEST", "PRÜFUNGSVORBEREITUNG", "ZERTIFIKAT",
];

function Run({ hidden }) {
  return (
    <ul aria-hidden={hidden} className="flex shrink-0 items-center">
      {WORDS.map((word) => (
        <li key={word} className="flex items-center">
          <span className="px-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-600">{word}</span>
          <span className="text-[9px] text-gold-400">◆</span>
        </li>
      ))}
    </ul>
  );
}

export default function Marquee() {
  return (
    <div dir="ltr" className="marquee border-y border-gold-100 bg-gold-50 py-2.5">
      <div className="marquee-track flex w-max">
        <Run />
        <Run hidden />
      </div>
    </div>
  );
}
