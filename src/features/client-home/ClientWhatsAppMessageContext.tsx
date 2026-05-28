"use client";

import { createContext, useContext } from "react";

const ClientWhatsAppMessageContext = createContext<string | undefined>(
  undefined,
);

export function useClientWhatsAppMessageOverride(): string | undefined {
  return useContext(ClientWhatsAppMessageContext);
}

type ClientWhatsAppMessageScopeProps = {
  message?: string;
  children: React.ReactNode;
};

/** Mensaje opcional del FAB para una pantalla concreta (p. ej. nombre del tour en reservar). */
export function ClientWhatsAppMessageScope({
  message,
  children,
}: ClientWhatsAppMessageScopeProps) {
  return (
    <ClientWhatsAppMessageContext.Provider value={message}>
      {children}
    </ClientWhatsAppMessageContext.Provider>
  );
}
