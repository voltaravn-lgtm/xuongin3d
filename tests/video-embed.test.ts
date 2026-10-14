import assert from 'node:assert/strict';
import test from 'node:test';
import { getProductVideoEmbed } from '../src/lib/video.ts';

test('uses the compact Instagram embed without the post caption', () => {
  const video = getProductVideoEmbed('https://www.instagram.com/reel/ABC123/?utm_source=ig_web_copy_link');
  assert.equal(video?.provider, 'instagram');
  assert.equal(video?.embedUrl, 'https://www.instagram.com/reel/ABC123/embed/');
  assert.equal(video?.embedUrl?.includes('/captioned/'), false);
});

test('keeps YouTube videos on the privacy-enhanced embed host', () => {
  const video = getProductVideoEmbed('https://youtu.be/dQw4w9WgXcQ');
  assert.equal(video?.provider, 'youtube');
  assert.equal(video?.embedUrl, 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
});
