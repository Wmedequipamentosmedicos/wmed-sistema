import test from "node:test";
import assert from "node:assert/strict";
import { hasSupabaseAnonConfig, getMissingSupabaseConfigKeys } from "./config";

test("returns false when Supabase URL or anon key are missing", () => {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const previousPublishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  try {
    assert.equal(hasSupabaseAnonConfig(), false);
    assert.deepEqual(getMissingSupabaseConfigKeys(), [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ]);
  } finally {
    if (previousUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    else delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (previousAnon) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = previousAnon;
    else delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (previousPublishable) process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = previousPublishable;
    else delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  }
});

test("accepts the publishable key alias when the anon key is absent", () => {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const previousPublishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable-key";

  try {
    assert.equal(hasSupabaseAnonConfig(), true);
    assert.deepEqual(getMissingSupabaseConfigKeys(), []);
  } finally {
    if (previousUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    else delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (previousAnon) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = previousAnon;
    else delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (previousPublishable) process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = previousPublishable;
    else delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  }
});

test("returns true when required public Supabase config is present", () => {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const previousPublishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  try {
    assert.equal(hasSupabaseAnonConfig(), true);
    assert.deepEqual(getMissingSupabaseConfigKeys(), []);
  } finally {
    if (previousUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    else delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (previousAnon) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = previousAnon;
    else delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (previousPublishable) process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = previousPublishable;
    else delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  }
});
