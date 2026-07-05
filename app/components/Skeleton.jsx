'use client';

// A single shimmering placeholder block.
export function Skeleton({ w = '100%', h = 14, r = 8, style }) {
  return (
    <div
      className="skeleton"
      style={{ width: w, height: h, borderRadius: r, ...style }}
    />
  );
}

// Placeholder while a board page loads.
export function BoardSkeleton() {
  return (
    <main>
      <Skeleton w="55%" h={30} />
      <div className="mt">
        <Skeleton w="40%" h={14} />
      </div>
      <div className="mt mb">
        <Skeleton w={110} h={22} r={999} />
      </div>
      <div className="card">
        <Skeleton w="45%" h={20} />
        <div className="mt">
          <Skeleton h={44} />
        </div>
        <div className="mt">
          <Skeleton h={44} />
        </div>
        <div className="mt">
          <Skeleton h={44} />
        </div>
      </div>
    </main>
  );
}

// Placeholder while the admin dashboard loads.
export function AdminSkeleton() {
  return (
    <main>
      <Skeleton w={120} h={28} />
      <div className="card mt">
        <Skeleton w="30%" h={20} />
        <div className="mt">
          <Skeleton h={44} />
        </div>
        <div className="mt">
          <Skeleton h={70} />
        </div>
        <div className="mt">
          <Skeleton w={140} h={40} />
        </div>
      </div>
      <div className="card">
        <Skeleton w="50%" h={18} />
        <div className="mt">
          <Skeleton w="70%" h={13} />
        </div>
      </div>
    </main>
  );
}
