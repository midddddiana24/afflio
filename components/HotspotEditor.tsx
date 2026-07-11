"use client";

import { useRef, useState } from "react";
import type { CampaignHotspotInput } from "@/lib/hotspots";

type Props = {
  imageUrl: string;
  hotspots: CampaignHotspotInput[];
  onChange: (hotspots: CampaignHotspotInput[]) => void;
};

export function HotspotEditor({ imageUrl, hotspots, onChange }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(hotspots.length ? 0 : -1);
  const selected = hotspots[selectedIndex];

  function addHotspot(event: React.MouseEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("button")) return;
    const point = eventPoint(event.clientX, event.clientY);
    if (!point) return;
    const next = [...hotspots, {
      label: `Product ${hotspots.length + 1}`,
      destinationUrl: "",
      platformSource: "shopee",
      xPercent: point.x,
      yPercent: point.y,
      widthPercent: 18,
      heightPercent: 12,
    }];
    onChange(next);
    setSelectedIndex(next.length - 1);
  }

  function moveHotspot(index: number, clientX: number, clientY: number) {
    const point = eventPoint(clientX, clientY);
    if (!point) return;
    onChange(hotspots.map((hotspot, itemIndex) => itemIndex === index
      ? { ...hotspot, xPercent: point.x, yPercent: point.y }
      : hotspot));
  }

  function eventPoint(clientX: number, clientY: number) {
    const bounds = stageRef.current?.getBoundingClientRect();
    if (!bounds) return null;
    return {
      x: Math.max(0, Math.min(100, ((clientX - bounds.left) / bounds.width) * 100)),
      y: Math.max(0, Math.min(100, ((clientY - bounds.top) / bounds.height) * 100)),
    };
  }

  function updateSelected(updates: Partial<CampaignHotspotInput>) {
    onChange(hotspots.map((hotspot, index) => index === selectedIndex ? { ...hotspot, ...updates } : hotspot));
  }

  function removeSelected() {
    onChange(hotspots.filter((_, index) => index !== selectedIndex));
    setSelectedIndex(Math.min(selectedIndex, hotspots.length - 2));
  }

  return (
    <div className="hotspot-editor">
      <div className="hotspot-editor__stage" onClick={addHotspot} ref={stageRef}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="Campaign hotspot workspace" draggable={false} src={imageUrl} />
        {hotspots.map((hotspot, index) => (
          <button
            aria-label={`Move ${hotspot.label || `hotspot ${index + 1}`}`}
            className={`hotspot-marker${selectedIndex === index ? " is-selected" : ""}`}
            key={`${index}-${hotspot.label}`}
            onClick={(event) => { event.stopPropagation(); setSelectedIndex(index); }}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              setSelectedIndex(index);
            }}
            onPointerMove={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) moveHotspot(index, event.clientX, event.clientY);
            }}
            style={{ left: `${hotspot.xPercent}%`, top: `${hotspot.yPercent}%` }}
            type="button"
          >
            <span>{index + 1}</span>
          </button>
        ))}
        <p className="hotspot-editor__hint">Click the image to add a hotspot. Drag a marker to reposition it.</p>
      </div>

      {selected ? (
        <div className="hotspot-editor__controls">
          <div className="section-head">
            <div><p className="app-topbar__eyebrow">Hotspot {selectedIndex + 1}</p><h3>Clickable product area</h3></div>
            <button className="btn btn-outline" onClick={removeSelected} type="button">Remove</button>
          </div>
          <label className="field"><span>Label</span><input maxLength={80} onChange={(event) => updateSelected({ label: event.target.value })} value={selected.label} /></label>
          <label className="field"><span>Affiliate URL</span><input onChange={(event) => updateSelected({ destinationUrl: event.target.value })} placeholder="https://shopee.ph/..." type="url" value={selected.destinationUrl} /></label>
          <div className="campaign-edit-grid">
            <label className="field"><span>Platform</span><select className="field-select" onChange={(event) => updateSelected({ platformSource: event.target.value })} value={selected.platformSource}><option value="shopee">Shopee</option><option value="tiktok">TikTok</option><option value="lazada">Lazada</option><option value="facebook">Facebook</option><option value="other">Other</option></select></label>
            <label className="field"><span>Area size</span><input max="40" min="6" onChange={(event) => updateSelected({ widthPercent: Number(event.target.value), heightPercent: Math.max(6, Number(event.target.value) * .7) })} type="range" value={selected.widthPercent} /></label>
          </div>
        </div>
      ) : <div className="hotspot-editor__empty"><strong>No hotspots yet</strong><span>Click a product in the image to make it interactive.</span></div>}
    </div>
  );
}
