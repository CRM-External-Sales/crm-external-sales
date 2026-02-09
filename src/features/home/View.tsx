export const View = () => {
  return (
    <div className="relative flex flex-1 items-center justify-center min-h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Imagen de fondo - Mano con espiral */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          width="500"
          height="500"
          viewBox="0 0 300 300"
          className="opacity-15"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Contorno de la mano */}
          <path
            d="M150 80 C140 70, 125 75, 115 85 L105 120 C95 135, 85 145, 75 155 L65 170 C55 180, 45 190, 35 200 L25 210"
            stroke="#313833"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Palma de la mano */}
          <ellipse
            cx="150"
            cy="150"
            rx="50"
            ry="60"
            stroke="#313833"
            strokeWidth="3"
            fill="none"
          />
          
          {/* Espiral en la palma */}
          <path
            d="M150 100 A 30 30 0 1 1 120 130 A 30 30 0 1 1 150 160 A 30 30 0 1 1 180 130 A 30 30 0 1 1 150 100"
            stroke="#313833"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          
          {/* Espiral interior más detallada */}
          <path
            d="M150 110 A 20 20 0 1 1 130 130 A 20 20 0 1 1 150 150 A 20 20 0 1 1 170 130 A 20 20 0 1 1 150 110"
            stroke="#313833"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          
          {/* Dedo meñique */}
          <path
            d="M105 120 L95 90 L85 70 L75 55"
            stroke="#313833"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Dedo anular */}
          <path
            d="M120 115 L110 85 L100 65 L90 50"
            stroke="#313833"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Dedo medio */}
          <path
            d="M135 110 L125 80 L115 60 L105 45"
            stroke="#313833"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Dedo índice */}
          <path
            d="M150 105 L140 75 L130 55 L120 40"
            stroke="#313833"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Dedo pulgar */}
          <path
            d="M165 115 L175 95 L185 80 L195 70"
            stroke="#313833"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Líneas decorativas en los dedos */}
          <path
            d="M95 90 L90 100"
            stroke="#313833"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M110 85 L105 95"
            stroke="#313833"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M125 80 L120 90"
            stroke="#313833"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M140 75 L135 85"
            stroke="#313833"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Contenido de texto centrado */}
      <div className="relative z-10 text-center px-4 max-w-2xl">
        <h1 className="text-4xl md:text-5xl font-bold text-[#313833] mb-4">
          Bienvenido
        </h1>
        <p className="text-xl md:text-2xl text-[#313833]/80 mb-6">
          Sistema de Gestión CRM
        </p>
        <p className="text-lg text-[#313833]/70">
          Venta Interna y Externa
        </p>
      </div>
    </div>
  );
};
