'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getGalleryItems, deleteGalleryItem, type GalleryItem } from '@/lib/gallery';

export default function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null);

  useEffect(() => {
    setItems(getGalleryItems());
  }, []);

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    deleteGalleryItem(id);
    setItems(getGalleryItems());
    if (lightbox?.id === id) setLightbox(null);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#080808', color: '#fff' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 28px', paddingTop: 40, paddingBottom: 72 }}>
        {/* Page title */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontFamily: '"Courier New", Courier, monospace', fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.05, marginBottom: 6 }}>
            Saved
          </div>
          <div style={{ fontSize: 14, color: '#777', marginTop: 8 }}>
            {items.length === 0 ? 'Nothing saved yet' : `${items.length} item${items.length === 1 ? '' : 's'}`}
          </div>
        </div>

        {items.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingBottom: 80, textAlign: 'center' }}>
            <div style={{ fontFamily: '"Courier New", monospace', fontSize: 64, color: '#111', fontWeight: 900, marginBottom: 24, letterSpacing: '0.05em' }}>
              SAVED
            </div>
            <p style={{ fontSize: 14, color: '#777', maxWidth: 340, lineHeight: 1.7, marginBottom: 32 }}>
              Use the Save button in any effect to capture a frame here.
            </p>
            <Link href="/" style={{
              fontFamily: '"Courier New", monospace', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none',
              padding: '9px 20px', background: '#1e1e1e', border: '1px solid #333',
              borderRadius: 6, color: '#bbb',
            }}>
              Browse Effects →
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {items.map((item) => (
              <GalleryCard
                key={item.id}
                item={item}
                onClick={() => setLightbox(item)}
                onDelete={(e) => handleDelete(item.id, e)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(12px)', display: 'flex', flexDirection: 'column', padding: 24 }}
        >
          {/* Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }} onClick={(e) => e.stopPropagation()}>
            <div>
              <div style={{ fontFamily: '"Courier New", monospace', fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fff' }}>
                {lightbox.effectName}
              </div>
              <div style={{ fontSize: 11, color: '#555', marginTop: 3 }}>
                {new Date(lightbox.dateSaved).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <a
                href={lightbox.thumbnail}
                download={`abode-${lightbox.effectSlug}.jpg`}
                style={{ padding: '7px 14px', background: '#1e1e1e', border: '1px solid #333', borderRadius: 6, fontSize: 11, color: '#bbb', textDecoration: 'none', fontFamily: '"Courier New", monospace', fontWeight: 600, letterSpacing: '0.08em' }}
              >
                Download
              </a>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(lightbox.id); }}
                style={{ padding: '7px 14px', background: '#1c0a0a', border: '1px solid #3f1010', borderRadius: 6, fontSize: 11, color: '#f87171', cursor: 'pointer', fontFamily: '"Courier New", monospace', fontWeight: 600, letterSpacing: '0.08em' }}
              >
                Delete
              </button>
              <button
                onClick={() => setLightbox(null)}
                style={{ padding: '7px 14px', background: '#1e1e1e', border: '1px solid #333', borderRadius: 6, fontSize: 11, color: '#bbb', cursor: 'pointer', fontFamily: '"Courier New", monospace', fontWeight: 600, letterSpacing: '0.08em' }}
              >
                ✕ Close
              </button>
            </div>
          </div>

          {/* Image */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            <img
              src={lightbox.thumbnail}
              alt={lightbox.effectName}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function GalleryCard({ item, onClick, onDelete }: { item: GalleryItem; onClick: () => void; onDelete: (e: React.MouseEvent) => void }) {
  return (
    <div
      onClick={onClick}
      className="gallery-card"
      style={{
        borderRadius: 10,
        border: '1px solid rgba(255,255,255,0.06)',
        background: '#0d0d0d',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'border-color 0.2s, transform 0.15s',
        position: 'relative',
      }}
    >
      {/* Thumbnail */}
      <div style={{ aspectRatio: '4/3', overflow: 'hidden', background: '#111', position: 'relative' }}>
        <img
          src={item.thumbnail}
          alt={item.effectName}
          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s' }}
        />
        {/* Video badge */}
        {item.type === 'video' && (
          <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4, padding: '2px 8px', fontSize: 10, color: '#fff', fontFamily: '"Courier New", monospace', letterSpacing: '0.06em' }}>
            VIDEO
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 14px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: '"Courier New", monospace', fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>
            {item.effectName}
          </div>
          <div style={{ fontSize: 10, color: '#777' }}>
            {new Date(item.dateSaved).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        </div>
        <button
          onClick={onDelete}
          className="delete-btn"
          style={{ padding: '5px 8px', background: 'transparent', border: '1px solid #333', borderRadius: 5, cursor: 'pointer', fontSize: 12, color: '#444', transition: 'color 0.15s, border-color 0.15s' }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
