import { Body, Container, Head, Heading, Html, Preview, Text } from '@react-email/components';
import * as React from 'react';
import { ArticleCard } from './ArticleCard';

export interface DigestEmailArticle {
  title: string;
  sourceDomain: string | null;
  clickUrl: string;
  likeUrl: string;
  dislikeUrl: string;
}

export interface DigestEmailProps {
  feedName: string;
  intro: string;
  articles: DigestEmailArticle[];
  likeLabel: string;
  dislikeLabel: string;
}

export function DigestEmail({ feedName, intro, articles, likeLabel, dislikeLabel }: DigestEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{intro}</Preview>
      <Body style={{ fontFamily: 'sans-serif', backgroundColor: '#f5f5f5', padding: '24px 0' }}>
        <Container style={{ backgroundColor: '#fff', padding: 24, borderRadius: 8 }}>
          <Heading as="h2" style={{ fontSize: 20 }}>
            {feedName}
          </Heading>
          <Text style={{ color: '#555' }}>{intro}</Text>
          {articles.map((article) => (
            <ArticleCard
              key={article.clickUrl}
              title={article.title}
              sourceDomain={article.sourceDomain}
              clickUrl={article.clickUrl}
              likeUrl={article.likeUrl}
              dislikeUrl={article.dislikeUrl}
              likeLabel={likeLabel}
              dislikeLabel={dislikeLabel}
            />
          ))}
        </Container>
      </Body>
    </Html>
  );
}
