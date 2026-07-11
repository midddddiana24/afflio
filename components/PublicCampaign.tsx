"use client";

type Hotspot = {
  id: string;
  label: string;
  destination_url: string;
  platform_source: string | null;
  x_percent: number;
  y_percent: number;
  width_percent: number;
  height_percent: number;
};

type Props = {
  campaignId: string;
  slug: string;
  title: string;
  caption: string | null;
  imageUrl: string;
  destinationUrl: string;
  platform: string;
  hotspots: Hotspot[];
};

export function PublicCampaign(props: Props) {
  function follow(destinationUrl: string, hotspotId?: string) {
    const body = JSON.stringify({ campaignId: props.campaignId, slug: props.slug, hotspotId });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/clicks/collect", new Blob([body], { type: "application/json" }));
    } else {
      fetch("/api/clicks/collect", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
    }
    window.location.assign(destinationUrl);
  }

  return (
    <main className="public-campaign">
      <header className="public-campaign__header"><a href="/" aria-label="Afflio home">AFFLIO</a><span>Interactive campaign</span></header>
      <article className="public-campaign__card">
        <div className="public-campaign__image">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt={props.title} src={props.imageUrl} />
          {props.hotspots.map((hotspot, index) => (
            <button
              aria-label={`Open ${hotspot.label}`}
              className="public-hotspot"
              key={hotspot.id}
              onClick={() => follow(hotspot.destination_url, hotspot.id)}
              style={{
                left: `${hotspot.x_percent}%`, top: `${hotspot.y_percent}%`,
                width: `${hotspot.width_percent}%`, height: `${hotspot.height_percent}%`,
              }}
              type="button"
            >
              <span>{index + 1}</span><strong>{hotspot.label}</strong>
            </button>
          ))}
        </div>
        <div className="public-campaign__body">
          <div className="public-campaign__meta"><span className="badge badge--active">{props.platform}</span><span>{props.hotspots.length ? `${props.hotspots.length} clickable products` : "Affiliate product"}</span></div>
          <h1>{props.title}</h1>
          {props.caption ? <p>{props.caption}</p> : null}
          {props.hotspots.length ? (
            <div className="public-product-list">
              {props.hotspots.map((hotspot, index) => <button key={hotspot.id} onClick={() => follow(hotspot.destination_url, hotspot.id)} type="button"><span>{index + 1}</span><strong>{hotspot.label}</strong><small>{hotspot.platform_source || "Shop now"}</small></button>)}
            </div>
          ) : <button className="btn btn-fill public-campaign__cta" onClick={() => follow(props.destinationUrl)} type="button">View product</button>}
        </div>
      </article>
      <p className="public-campaign__footer">Links open on the merchant website. Powered by Afflio.</p>
    </main>
  );
}
