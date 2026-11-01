// Stamps `completed_at` on every task write that changes status, so completion
// timing no longer has to be inferred from updated_date (which moves on any edit,
// including owner backfills).
//
// Usage: wrap the payload right before it reaches the entity API.
//   base44.entities.Task.update(id, withCompletionStamp(data))
export function withCompletionStamp(data) {
  if (!data || typeof data !== "object") return data;
  if (!Object.prototype.hasOwnProperty.call(data, "status")) return data;
  if (data.status === "completed") {
    return { ...data, completed_at: data.completed_at || new Date().toISOString() };
  }
  // Moving back out of completed clears the stamp, so a task re-opened and
  // finished again gets one fresh, accurate completion time.
  return { ...data, completed_at: null };
}