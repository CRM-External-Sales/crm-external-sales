"use client";

import { useEffect, useState } from "react";

export default function Home() {
  // javascript logic
  const [name, setName] = useState("Joel");

  const users = [
    { id: 1, name: "Eddier" },
    { id: 2, name: "Eddier" },
    { id: 3, name: "Eddier" },
  ];

  useEffect(() => {
    setName("Joel");
  }, []);

  // css html
  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        {users.map((user) => (
          <div
            key={user.id}
            className="text-2xl sm:text-4xl font-bold text-center sm:text-left"
          >
            Hello, {user.name}!
          </div>
        ))}
      </main>
    </div>
  );
}
