"use client";

import { useState } from "react";
import { QrStudio } from "@/components/dashboard/qr-studio";

export function QrPanel({ initialValue = "" }: { initialValue?: string }) {
  const [value, setValue] = useState(initialValue);
  return <QrStudio onValueChange={setValue} value={value} />;
}
