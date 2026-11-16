import { liveStory } from '@/content/story';

const story = {
  background: 'From Japanese.',
  roots: [{ part: 'ko', meaning: 'tree' }, { part: '', meaning: 'dropped' }],
  myth: '  ',
  fun_fact: 'A fact.',
};

test('a live story is returned cleaned up', () => {
  expect(liveStory({ story, story_status: 'live' })).toEqual({
    background: 'From Japanese.',
    roots: [{ part: 'ko', meaning: 'tree' }],
    myth: null,
    fun_fact: 'A fact.',
  });
});

test('drafts, missing and empty stories stay hidden', () => {
  expect(liveStory({ story, story_status: 'draft' })).toBeNull();
  expect(liveStory({ story: null, story_status: 'live' })).toBeNull();
  expect(liveStory({ story: { ...story, background: ' ' }, story_status: 'live' })).toBeNull();
  expect(liveStory({})).toBeNull();
});
