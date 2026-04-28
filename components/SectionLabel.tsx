'use client';

import React from 'react';
import styled from 'styled-components';

interface SectionLabelProps {
  label: string;
  icon?: string;
  rightContent?: React.ReactNode;
}

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid #222;
  padding-top: 12px;
  margin-top: 8px;
  margin-bottom: 8px;
`;

const Text = styled.span`
  font-size: 10px;
  color: #999;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-weight: 600;
`;

const Right = styled.span`
  font-size: 10px;
  color: #888;
`;

export default function SectionLabel({ label, icon = '⊙', rightContent }: SectionLabelProps) {
  return (
    <Row>
      <Text>{icon} {label}</Text>
      {rightContent && <Right>{rightContent}</Right>}
    </Row>
  );
}
