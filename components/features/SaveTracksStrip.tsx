export default function SaveTracksStrip({
  saved,
  onSave,
}: {
  saved: boolean;
  onSave: () => void;
}) {
  return (
    <section className="track-save-strip">
      <div>
        <p className="section-kicker">Build your collection</p>
        <p>Save these individual tracks to use in future recommendations.</p>
      </div>
      <button className="save-button" type="button" disabled={saved} onClick={onSave}>
        {saved ? "Tracks saved" : "Save both tracks"}
      </button>
    </section>
  );
}
