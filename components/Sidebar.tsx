'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { C, effects } from '@/lib/effects-data';

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { label: 'DASHBOARD', icon: '▣', href: '/', slug: '' },
    ...effects.map(e => ({
      label: e.label,
      icon: e.icon,
      href: `/effects/${e.slug}`,
      slug: e.slug
    }))
  ];

  return (
    <aside style={{
      width: isCollapsed ? 50 : 200,
      minWidth: isCollapsed ? 50 : 200,
      transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      position: 'sticky',
      top: 0,
      height: '100vh',
      borderRight: `1px solid ${C.border}`,
      background: '#041016',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000,
      overflowX: 'hidden',
    }}>
      {/* Toggle Button */}
      <div style={{ 
        height: 44, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: isCollapsed ? 'center' : 'flex-end',
        padding: isCollapsed ? 0 : '0 12px',
        borderBottom: `1px solid ${C.border}`,
      }}>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{
            background: 'none',
            border: 'none',
            color: C.textDim,
            cursor: 'pointer',
            fontSize: 18,
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.3s',
            transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          {isCollapsed ? '→' : '←'}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }} className="no-scrollbar">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.slug && pathname.includes(item.slug));
          
          return (
            <Link key={item.label} href={item.href} 
              className={`sidebar-link ${isActive ? 'active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 16px',
                textDecoration: 'none',
                background: isActive ? C.surfaceHigh : 'transparent',
                borderLeft: isActive ? `3px solid ${C.primary}` : '3px solid transparent',
                transition: 'all 0.15s ease-out',
                whiteSpace: 'nowrap',
                gap: 12,
              }}
            >
              <span style={{ 
                fontSize: 16, 
                color: isActive ? C.primary : C.textDim,
                width: 20,
                textAlign: 'center',
                flexShrink: 0,
              }}>
                {item.icon}
              </span>
              
              {!isCollapsed && (
                <span style={{
                  fontSize: 11,
                  fontFamily: 'monospace',
                  color: isActive ? C.text : C.textDim,
                  fontWeight: isActive ? 700 : 400,
                  letterSpacing: '0.1em',
                }}>
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </aside>
  );
}
