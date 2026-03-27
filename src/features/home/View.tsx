export const View = () => {
  return (
    <div className="relative flex flex-1 items-center justify-center min-h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* ACA VA EL FONDO DEL HOMEEEE */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          width="500"
          height="500"
          viewBox="0 0 300 300"
          className="opacity-15"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        ></svg>
      </div>

      {/* Contenido de texto centrado */}
      <div className="relative z-10 text-center px-4 max-w-2xl">
        <h1 className="text-4xl md:text-5xl font-bold text-[#313833] mb-4">
          Bienvenido
        </h1>
        <p className="text-xl md:text-2xl text-[#313833]/80 mb-6">
          Sistema de Gestión CRM
        </p>
        <p className="text-lg text-[#313833]/70">Venta Interna y Externa</p>
      </div>
    </div>
  );
};
