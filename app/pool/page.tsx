"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export default function PoolIndex() {
  const r = useRouter();
  useEffect(() => r.replace("/pool/pilot"), [r]);
  return null;
}
