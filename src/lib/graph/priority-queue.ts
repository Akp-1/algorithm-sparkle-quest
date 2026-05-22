// Min-heap priority queue keyed by number. Simple, dependency-free.

export class MinHeap<T> {
  private heap: { key: number; value: T }[] = [];

  get size() {
    return this.heap.length;
  }

  push(key: number, value: T) {
    this.heap.push({ key, value });
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): { key: number; value: T } | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.bubbleDown(0);
    }
    return top;
  }

  private bubbleUp(i: number) {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.heap[parent].key > this.heap[i].key) {
        [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
        i = parent;
      } else break;
    }
  }

  private bubbleDown(i: number) {
    const n = this.heap.length;
    while (true) {
      const l = i * 2 + 1;
      const r = i * 2 + 2;
      let smallest = i;
      if (l < n && this.heap[l].key < this.heap[smallest].key) smallest = l;
      if (r < n && this.heap[r].key < this.heap[smallest].key) smallest = r;
      if (smallest !== i) {
        [this.heap[smallest], this.heap[i]] = [this.heap[i], this.heap[smallest]];
        i = smallest;
      } else break;
    }
  }
}
