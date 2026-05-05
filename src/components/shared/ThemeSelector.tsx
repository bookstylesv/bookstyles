'use client';

/**
 * ThemeSelector — Modal de selección de temas para BarberPro.
 * Organizado en 3 secciones: Neutros, Masculinos, Femeninos.
 * Muestra preview de colores + nombre + descripción.
 */

import { useState } from 'react';
import { Modal, Tabs, Tooltip } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import { useBarberTheme } from '@/context/ThemeContext';
import { THEMES_BY_CATEGORY, type BarberTheme } from '@/config/barber-themes';

// ─── ThemeCard ────────────────────────────────────────────────────────────────

function ThemeCard({
  theme,
  active,
  onSelect,
}: {
  theme:    BarberTheme;
  active:   boolean;
  onSelect: (id: string) => void;
}) {
  const [sidebarColor, primaryColor, contentColor] = theme.preview;

  return (
    <Tooltip title={theme.description} placement="top">
      <button
        type="button"
        onClick={() => onSelect(theme.id)}
        style={{
          position:     'relative',
          border:       active ? `2px solid ${primaryColor}` : '2px solid transparent',
          borderRadius: 12,
          padding:      0,
          cursor:       'pointer',
          background:   'transparent',
          outline:      active ? `3px solid ${primaryColor}40` : 'none',
          transition:   'all 0.15s ease',
          width:        '100%',
          overflow:     'hidden',
        }}
      >
        {/* Preview miniatura */}
        <div style={{ display: 'flex', height: 64, borderRadius: 10, overflow: 'hidden' }}>
          {/* Sidebar strip */}
          <div style={{ width: 24, background: sidebarColor, flexShrink: 0 }} />
          {/* Content area */}
          <div style={{ flex: 1, background: contentColor, padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {/* Fake header bar */}
            <div style={{ height: 6, borderRadius: 3, background: primaryColor, width: '60%' }} />
            {/* Fake rows */}
            <div style={{ height: 4, borderRadius: 2, background: `${sidebarColor}40`, width: '80%' }} />
            <div style={{ height: 4, borderRadius: 2, background: `${sidebarColor}30`, width: '65%' }} />
            {/* Fake badge */}
            <div style={{
              marginTop: 'auto',
              height:    12, borderRadius: 4,
              background: primaryColor,
              width:      32,
              opacity:    0.85,
            }} />
          </div>
        </div>

        {/* Label */}
        <div style={{
          padding:   '6px 8px',
          background: active ? `${primaryColor}15` : 'hsl(var(--bg-subtle, 0 0% 97%))',
          display:   'flex',
          alignItems: 'center',
          gap:       4,
        }}>
          <span style={{ fontSize: 14 }}>{theme.emoji}</span>
          <span style={{
            fontSize:   11,
            fontWeight: active ? 700 : 500,
            color:      active ? primaryColor : 'hsl(var(--text-primary, 222 11% 41%))',
            whiteSpace: 'nowrap',
            overflow:   'hidden',
            textOverflow: 'ellipsis',
            flex: 1,
          }}>
            {theme.name}
          </span>
          <span style={{ fontSize: 9, opacity: 0.6 }} title={theme.isDark ? 'Oscuro' : 'Claro'}>
            {theme.isDark ? '🌙' : '☀️'}
          </span>
          {active && (
            <CheckOutlined style={{ fontSize: 10, color: primaryColor }} />
          )}
        </div>
      </button>
    </Tooltip>
  );
}

// ─── ThemeGrid ────────────────────────────────────────────────────────────────

function ThemeGrid({
  themes,
  activeId,
  onSelect,
}: {
  themes:   BarberTheme[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div style={{
      display:             'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
      gap:                 12,
      padding:             '12px 0',
    }}>
      {themes.map(t => (
        <ThemeCard
          key={t.id}
          theme={t}
          active={t.id === activeId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

// ─── ThemeSelector (Modal) ────────────────────────────────────────────────────

interface ThemeSelectorProps {
  open:    boolean;
  onClose: () => void;
}

export default function ThemeSelector({ open, onClose }: ThemeSelectorProps) {
  const { themeId, setTheme } = useBarberTheme();

  function handleSelect(id: string) {
    setTheme(id);
  }

  const tabItems = [
    {
      key:      'neutro',
      label:    '🌊 Neutros',
      children: (
        <ThemeGrid
          themes={THEMES_BY_CATEGORY.neutro}
          activeId={themeId}
          onSelect={handleSelect}
        />
      ),
    },
    {
      key:      'masculino',
      label:    '✂️ Masculinos',
      children: (
        <ThemeGrid
          themes={THEMES_BY_CATEGORY.masculino}
          activeId={themeId}
          onSelect={handleSelect}
        />
      ),
    },
    {
      key:      'femenino',
      label:    '🌸 Femeninos',
      children: (
        <ThemeGrid
          themes={THEMES_BY_CATEGORY.femenino}
          activeId={themeId}
          onSelect={handleSelect}
        />
      ),
    },
  ];

  // Determina la pestaña activa según el tema actual
  const activeCategory = (() => {
    const found = [...THEMES_BY_CATEGORY.neutro, ...THEMES_BY_CATEGORY.masculino, ...THEMES_BY_CATEGORY.femenino]
      .find(t => t.id === themeId);
    return found?.category ?? 'neutro';
  })();

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🎨</span>
          <span style={{ fontWeight: 700 }}>Seleccionar tema visual</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={540}
      styles={{
        body: { padding: '0 4px 8px' },
      }}
    >
      <p style={{
        margin:   '4px 0 8px',
        fontSize: 12.5,
        color:    'hsl(var(--text-muted, 246 6% 67%))',
      }}>
        El tema se aplica de inmediato y se guarda automáticamente para esta barbería.
      </p>

      <Tabs
        defaultActiveKey={activeCategory}
        items={tabItems}
        size="small"
        tabBarStyle={{ marginBottom: 0 }}
      />
    </Modal>
  );
}
