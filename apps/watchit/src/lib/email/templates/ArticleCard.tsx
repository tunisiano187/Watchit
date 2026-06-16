import { Column, Link, Row, Section, Text } from '@react-email/components';
import * as React from 'react';

export interface ArticleCardProps {
  title: string;
  sourceDomain: string | null;
  clickUrl: string;
  likeUrl: string;
  dislikeUrl: string;
  likeLabel: string;
  dislikeLabel: string;
}

export function ArticleCard({
  title,
  sourceDomain,
  clickUrl,
  likeUrl,
  dislikeUrl,
  likeLabel,
  dislikeLabel,
}: ArticleCardProps) {
  return (
    <Section style={{ borderBottom: '1px solid #e5e5e5', paddingBottom: 12, marginBottom: 12 }}>
      <Text style={{ fontSize: 16, margin: '0 0 4px' }}>
        <Link href={clickUrl} style={{ color: '#1a1a1a', textDecoration: 'none' }}>
          {title}
        </Link>
      </Text>
      {sourceDomain && (
        <Text style={{ fontSize: 12, color: '#888', margin: '0 0 8px' }}>{sourceDomain}</Text>
      )}
      <Row>
        <Column>
          <Link href={likeUrl} style={{ fontSize: 14, marginRight: 16, textDecoration: 'none' }}>
            ❤️ {likeLabel}
          </Link>
        </Column>
        <Column>
          <Link href={dislikeUrl} style={{ fontSize: 14, textDecoration: 'none' }}>
            👎 {dislikeLabel}
          </Link>
        </Column>
      </Row>
    </Section>
  );
}
