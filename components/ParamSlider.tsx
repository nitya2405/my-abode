'use client';

import * as Slider from '@radix-ui/react-slider';
import styled from 'styled-components';

interface ParamSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  unit?: string;
  decimals?: number;
}

const Wrap = styled.div`
  margin-bottom: 14px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 7px;
`;

const Label = styled.span`
  font-size: 11px;
  color: #8e9aaa;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const Value = styled.span`
  font-size: 10px;
  font-family: 'Courier New', Courier, monospace;
  color: #acc7fd;
  background: #152028;
  padding: 2px 7px;
  border-radius: 0;
  min-width: 36px;
  text-align: right;
`;

const Root = styled(Slider.Root)`
  position: relative;
  display: flex;
  align-items: center;
  user-select: none;
  touch-action: none;
  width: 100%;
  height: 20px;
`;

const Track = styled(Slider.Track)`
  background: #152028;
  position: relative;
  flex-grow: 1;
  border-radius: 0;
  height: 3px;
`;

const Range = styled(Slider.Range)`
  position: absolute;
  background: rgba(172,199,253,0.4);
  border-radius: 0;
  height: 100%;
`;

const Thumb = styled(Slider.Thumb)`
  display: block;
  width: 10px;
  height: 10px;
  background: #acc7fd;
  border-radius: 0;
  border: none;
  cursor: pointer;
  outline: none;
  transition: transform 0.1s, background 0.1s;

  &:hover,
  &.js-hovered {
    background: #d7e4ed;
  }
  &:focus-visible {
    box-shadow: 0 0 0 2px rgba(172,199,253,0.4);
  }
  &:active {
    transform: scale(1.15);
    background: #fff;
  }
`;

export default function ParamSlider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  unit = '',
  decimals,
}: ParamSliderProps) {
  const display = decimals !== undefined ? value.toFixed(decimals) : String(value);

  return (
    <Wrap>
      <Header>
        <Label>{label}</Label>
        <Value>{display}{unit}</Value>
      </Header>
      <Root
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
      >
        <Track>
          <Range />
        </Track>
        <Thumb />
      </Root>
    </Wrap>
  );
}
