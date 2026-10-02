/**
 * Firebase Utilities Test Suite
 * 
 * Unit tests for Firebase utility functions.
 * Tests database query functionality and data retrieval operations.
 * 
 * Test Cases:
 * - findMatchingValuesByChild: Verifies exact child property matching
 *   Tests that querying returns only records with exact child value matches
 */

import test from "node:test";
import assert from "node:assert/strict";
import { findMatchingValuesByChild } from "./firebase";

test("findMatchingValuesByChild returns only exact child matches", () => {
  const data = {
    a: { username: "alice", password: "hash1" },
    b: { username: "bob", password: "hash2" },
    c: { username: "alice", password: "hash3" },
  };

  const matches = findMatchingValuesByChild<{ username: string; password: string }>(data, "username", "alice");

  assert.equal(matches.length, 2);
  assert.deepEqual(matches.map((item) => item.username), ["alice", "alice"]);
  assert.deepEqual(matches.map((item) => item.password), ["hash1", "hash3"]);
});
