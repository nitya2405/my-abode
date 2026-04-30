'use client';

import * as ToggleGroup from '@radix-ui/react-toggle-group';
import styled from 'styled-components';

interface ButtonGroupProps {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  cols?: number;
}

const Grid = styled(ToggleGroup.Root)<{ $cols: number }>`
  display: grid;
  grid-template-columns: repeat(${(p) => p.$cols}, 1fr);
  gap: 4px;
  margin-bottom: 4px;
`;

const Item = styled(ToggleGroup.Item)`
  padding: 6px 4px;
  font-size: 11px;
  font-family: 'Courier New', Courier, monospace;
  font-weight: 600;
  letter-spacing: 0.04em;
  border-radius: 0;
  border: 1px solid rgba(172,199,253,0.15);
  cursor: pointer;
  background: #152028;
  color: #8e9aaa;
  transition: background 0.1s, color 0.1s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  outline: none;

  &[data-state='on'] {
    background: #acc7fd;
    color: #08151b;
    border-color: #acc7fd;
  }
  &:hover:not([data-state='on']),
  &.js-hovered:not([data-state='on']) {
    background: #1c2e3a;
    color: #acc7fd;
  }
  &:focus-visible {
    box-shadow: inset 0 0 0 1px rgba(172,199,253,0.3);
  }
`;

export default function ButtonGroup({ options, value, onChange, cols }: ButtonGroupProps) {
  const gridCols = cols ?? Math.min(options.length, 4);

  // Normalise value for comparison (lowercase, no spaces)
  const normalise = (s: string) => s.toLowerCase().replace(/\s+/g, '');
  const currentNorm = normalise(value);

  // Find which option key matches current value
  const activeKey = options.find((o) => normalise(o) === currentNorm) ?? options[0];

  return (
    <Grid
      type="single"
      value={activeKey}
      onValueChange={(v) => { if (v) onChange(normalise(v)); }}
      $cols={gridCols}
    >
      {options.map((opt) => (
        <Item key={opt} value={opt}>
          {opt}
        </Item>
      ))}
    </Grid>
  );
}
