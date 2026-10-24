import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto grid max-w-lg gap-3 px-4 py-16">
      <h1 className="font-display text-4xl">That ticker isn't on the shelf</h1>
      <p className="text-mist">Maple Market keeps to a set of large TSX names, written like RY.TO.</p>
      <Link href="/" className="text-gold">
        Back to the sky
      </Link>
    </div>
  );
}
