export default function SiteBackground({ subdued = false }: { subdued?: boolean }) {
  return (
    <div aria-hidden="true" className={`site-scene-background${subdued ? ' site-scene-background-subdued' : ''}`}>
      <div className="site-scene-image" />
      <div className="site-scene-shade" />
    </div>
  );
}
