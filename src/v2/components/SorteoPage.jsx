import React, { useState, useEffect, useRef } from "react";
import axios from 'axios';
import { Fullscreen, FullscreenExit } from '@mui/icons-material';
import environments from "../environments/environment";

export default function SorteoPage() {
  const [allParticipants, setAllParticipants] = useState([]); // Lista completa de participantes
  const [availableParticipants, setAvailableParticipants] = useState([]); // Participantes que aún no han ganado
  const [participants, setParticipants] = useState([]); // Lista de participantes actual
  const [history, setHistory] = useState([]); // Historial de ganadores
  const [winner, setWinner] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [currentHighlight, setCurrentHighlight] = useState('');
  const spinDuration = 5000; // 5 seconds
  const spinRef = useRef(null);
  const [showWinnerAnimation, setShowWinnerAnimation] = useState(false);
  const [winners, setWinners] = useState([]); // Lista de ganadores
  const [showHistory, setShowHistory] = useState(true); // Mostrar el historial por defecto
  // Función para formatear la fecha a YYYY-MM-DD en la zona horaria local
  const formatLocalDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Función para obtener la fecha actual en formato YYYY-MM-DD
  const getTodayDate = () => {
    return formatLocalDate(new Date());
  };

  const [fechaInicio, setFechaInicio] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 6);
    return formatLocalDate(date);
  });
  const [fechaFin, setFechaFin] = useState(getTodayDate());
  const [registradores, setRegistradores] = useState([]);
  const [selectedTipoRegistrador, setSelectedTipoRegistrador] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);

  // Función para activar/desactivar pantalla completa
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // Escuchar cambios en el estado de pantalla completa
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Colores vivos para la ruleta
  const colors = [
    "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF",
    "#FF9F40", "#8AC926", "#1982C4", "#6A4C93", "#F15BB5",
    "#FF5733", "#33FF57", "#5733FF", "#33FFEC", "#EC33FF",
    "#FFEC33", "#FF33A8", "#33A8FF", "#A8FF33", "#A833FF"
  ];
  
  // Estilos para la transición suave de la ruleta
  const wheelStyle = {
    transform: `rotate(${rotation}deg)`,
    transition: spinning ? 'none' : 'transform 0.1s ease-out',
    backgroundColor: 'white'
  };

  // Cargar tipos de registradores
  const fetchRegistradores = async () => {
    try {
      const API_URL = process.env.REACT_APP_API_URL || environments.apiUrl;
      const response = await axios.get(`${API_URL}/registrador/activos-con-tipo`);
      
      if (response.data.success) {
        const tiposUnicos = [];
        const tiposVistos = new Set();
        
        response.data.data.forEach(registrador => {
          if (!tiposVistos.has(registrador.id_tipo_registrador)) {
            tiposVistos.add(registrador.id_tipo_registrador);
            tiposUnicos.push({
              id: registrador.id_tipo_registrador,
              nombre: registrador.nombre_tipo,
              descripcion: registrador.tipo_descripcion
            });
          }
        });
        
        setRegistradores(tiposUnicos);
        if (tiposUnicos.length > 0 && !selectedTipoRegistrador) {
          setSelectedTipoRegistrador(tiposUnicos[0].id.toString());
        }
      }
    } catch (error) {
      console.error('Error al cargar registradores:', error);
    }
  };

  // Cargar participantes con filtros
  const fetchParticipants = async () => {
    setLoading(true);
    try {
      const API_URL = process.env.REACT_APP_API_URL || environments.apiUrl;
      const response = await axios.get(`${API_URL}/usuarios-otros`);
      
      if (response.data.success) {
        // Formatear fechas para comparación
        const fechaInicioDate = new Date(fechaInicio);
        fechaInicioDate.setUTCHours(0, 0, 0, 0);
        
        const fechaFinDate = new Date(fechaFin);
        fechaFinDate.setUTCHours(23, 59, 59, 999);
        
        // Filtrar y mapear en un solo paso
        const participantesFormateados = response.data.data
          .filter(participante => {
            if (!participante.fecha_registro) return false;
            
            // Filtrar por fecha
            const fechaRegistro = new Date(participante.fecha_registro);
            const fechaRegistroAjustada = new Date(fechaRegistro.getTime() - (fechaRegistro.getTimezoneOffset() * 60000));
            const cumpleFecha = fechaRegistroAjustada >= fechaInicioDate && 
                              fechaRegistroAjustada <= fechaFinDate;
            
            // Filtrar por tipo de registrador
            const tipoRegistradorId = participante.id_tipo_registrador_snapshot?.toString();
            const cumpleTipo = !selectedTipoRegistrador || tipoRegistradorId === selectedTipoRegistrador;
            
            return cumpleFecha && cumpleTipo;
          })
          .map(p => ({
            id: p.id,
            nombre: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Sin nombre',
            cedula: p.id_card,
            celular: p.phone,
            fecha_registro: p.fecha_registro,
            tipo_registrador: p.nombre_tipo_registrador,
            contador: 1,
            // Añadir información del filtro actual
            filtroActual: `${fechaInicio}-${fechaFin}-${selectedTipoRegistrador}`
          }));
        
        // Actualizar el estado con los nuevos participantes
        setAllParticipants(participantesFormateados);
        
        // Filtrar para excluir a TODOS los ganadores previos, independientemente del filtro
        const cedulasGanadoras = new Set(winners.map(w => w.cedula));
        const participantesSinGanadores = participantesFormateados.filter(
          p => !cedulasGanadoras.has(p.cedula)
        );
        
        // Actualizar la lista de participantes disponibles
        setAvailableParticipants(participantesSinGanadores);
        setParticipants(participantesSinGanadores);
      }

      // Data is already processed in participantesFiltrados and participantesFormateados
    } catch (error) {
      console.error("Error cargando participantes:", error);
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos iniciales al cambiar filtros
  useEffect(() => {
    const loadData = async () => {
      // Guardar el estado de carga actual
      const wasLoading = loading;
      if (!wasLoading) setLoading(true);
      
      try {
        await fetchRegistradores();
        await fetchParticipants();
      } finally {
        if (!wasLoading) setLoading(false);
      }
    };
    
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaInicio, fechaFin, selectedTipoRegistrador]);

  // Actualizar participantes disponibles cuando cambia la lista de ganadores o participantes
  useEffect(() => {
    if (allParticipants.length === 0) return;
    
    // Filtrar participantes que no estén en la lista de ganadores
    const participantesSinGanadores = allParticipants.filter(
      p => !winners.some(w => w.cedula === p.cedula)
    );
    
    // Actualizar la lista de participantes disponibles
    setAvailableParticipants(participantesSinGanadores);
    setParticipants(participantesSinGanadores);
    
    // Si no hay más participantes disponibles, mostrar mensaje
    if (participantesSinGanadores.length === 0 && allParticipants.length > 0) {
      console.log('No hay más participantes disponibles');
    }
  }, [winners, allParticipants]);

  const startDraw = () => {
    if (spinning) {
      alert('La ruleta ya está girando');
      return;
    }
    
    if (availableParticipants.length === 0) {
      alert('No hay participantes disponibles para el sorteo. Por favor, verifica los filtros.');
      return;
    }
    
    setSpinning(true);
    setWinner(null);
    setShowWinnerAnimation(false);
    setCurrentHighlight('');
    
    // Seleccionar un ganador aleatorio de los participantes disponibles
    const winnerIndex = Math.floor(Math.random() * availableParticipants.length);
    const selectedWinner = availableParticipants[winnerIndex];
    
    // Calcular la rotación necesaria para que la flecha apunte al ganador
    const sliceDegree = 360 / allParticipants.length;
    const winnerPosition = allParticipants.findIndex(p => p.cedula === selectedWinner.cedula);
    const targetDegree = 360 - (sliceDegree * winnerPosition) - (sliceDegree / 2);
    
    // Rotación total = vueltas completas + posición del ganador
    const targetRotation = (360 * 10) + targetDegree;
    
    // Animation variables
    const startTime = Date.now();
    const startRotation = rotation;
    const totalRotation = startRotation + targetRotation;
    
    // Animation function
    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / spinDuration, 1);
      const easeOutProgress = 1 - Math.pow(1 - progress, 3); // Ease-out effect
      const currentRotation = startRotation + (totalRotation - startRotation) * easeOutProgress;
      
      setRotation(currentRotation);
      updateHighlight(currentRotation);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Animation complete
        const sliceDegree = 360 / allParticipants.length;
        const normalizedRotation = totalRotation % 360;
        const winnerIndex = Math.floor(normalizedRotation / sliceDegree) % allParticipants.length;
        const selectedWinner = allParticipants[allParticipants.length - 1 - winnerIndex];
        
        // Add the winner to the winners list with filter info
        const winnerWithFilter = {
          ...selectedWinner,
          filtroId: `${selectedWinner.cedula}-${fechaInicio}-${fechaFin}-${selectedTipoRegistrador}`,
          fechaSorteo: new Date().toISOString(),
          // Almacenar el filtro actual para referencia
          filtroActual: selectedWinner.filtroActual
        };
        
        // Actualizar la lista de ganadores
        setWinners(prevWinners => [...prevWinners, winnerWithFilter]);
        
        // Actualizar las listas de participantes para que el ganador no aparezca más
        setAvailableParticipants(prev => 
          prev.filter(p => p.cedula !== selectedWinner.cedula)
        );
        
        setParticipants(prev => 
          prev.filter(p => p.cedula !== selectedWinner.cedula)
        );
        
        // También actualizar allParticipants para mantener la consistencia
        setAllParticipants(prev => 
          prev.filter(p => p.cedula !== selectedWinner.cedula)
        );
        
        // Create a new history entry with unique ID
        const newHistoryEntry = {
          id: Date.now(),
          winner: selectedWinner,
          date: new Date().toISOString()
        };
        
        // Update state with the new history entry
        setHistory(prev => [...prev, newHistoryEntry].filter((entry, index, self) => 
          index === self.findIndex(t => t.id === entry.id)
        ));
        
        setWinner(selectedWinner);
        setShowWinnerAnimation(true);
        setSpinning(false);
      }
    };
    
    // Start the animation
    requestAnimationFrame(animate);
  };

  // Actualizar el resaltado según la rotación actual
  const updateHighlight = (angle) => {
    if (allParticipants.length === 0) return;
    
    const sliceDegree = 360 / allParticipants.length;
    const normalizedAngle = ((angle % 360) + 360) % 360; // Asegurar ángulo entre 0 y 360
    const index = Math.floor(normalizedAngle / sliceDegree);
    const currentIndex = (allParticipants.length - 1 - index) % allParticipants.length;
    setCurrentHighlight(allParticipants[currentIndex]?.nombre || '');
  };
  
  // Get the browser's history object properly
  const browserHistory = window.history;

  // Para no mostrar nombres largos en la ruleta
  // Verificar si un participante ya ha ganado
  const hasWon = (participant) => {
    return winners.some(winner => winner.cedula === participant.cedula);
  };

  const shortenName = (name) => {
    if (!name) return '';
    if (name.length > 15) {
      return name.substring(0, 13) + "...";
    }
    return name;
  };

  // Reiniciar el sorteo
  const resetWinners = () => {
    if (window.confirm('¿Estás seguro de que deseas reiniciar la lista de ganadores? Esto permitirá que todos los participantes puedan volver a ganar.')) {
      setWinners([]);
      // Recargar los participantes para asegurar que todos estén disponibles
      fetchParticipants();
    }
  };

  // Formatear fecha
  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    };
    return new Date(dateString).toLocaleString('es-ES', options);
  };

  // Manejadores de cambios
  const handleFechaInicioChange = (e) => {
    setFechaInicio(e.target.value);
  };

  const handleFechaFinChange = (e) => {
    setFechaFin(e.target.value);
  };

  const handleTipoRegistradorChange = (e) => {
    setSelectedTipoRegistrador(e.target.value);
  };

  // Función para aplicar el filtro
  const aplicarFiltro = () => {
    if (new Date(fechaInicio) > new Date(fechaFin)) {
      alert('La fecha de inicio no puede ser mayor a la fecha de fin');
      return;
    }
    if (!selectedTipoRegistrador) {
      alert('Por favor seleccione un tipo de registrador');
      return;
    }
    
    // Limpiar estado antes de cargar nuevos participantes
    setParticipants([]);
    setAllParticipants([]);
    setAvailableParticipants([]);
    
    // No limpiamos winners aquí, solo los filtramos en fetchParticipants
    fetchParticipants();
  };

  // Estilos para el contenedor de pantalla completa
  const fullscreenStyles = isFullscreen ? {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    overflow: 'hidden',
    backgroundImage: "url('/assets/img/ruletafondo.png')",
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center center',
    backgroundSize: 'cover'
  } : {};

  // Renderizar vista de pantalla completa
  if (isFullscreen) {
    return (
      <div ref={containerRef} style={fullscreenStyles}>
        <div className="absolute top-4 right-4">
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors"
            title="Salir de pantalla completa"
          >
            <FullscreenExit />
          </button>
        </div>
        
        <div className="flex flex-col items-center justify-center flex-grow w-full max-w-4xl px-4">
          <h1 className="text-4xl font-bold text-gray-800 mb-8">Ruleta de la Suerte</h1>
          
          <div className="w-full max-w-2xl relative">
            <div className="p-6 mb-6">
              <div className="relative w-full aspect-square">
                {/* Indicador de nombre mientras gira */}
                {spinning && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
                    <div className="bg-white/80 backdrop-blur-sm p-4 rounded-lg shadow-xl text-center">
                      <div className="text-2xl font-bold text-blue-700 mb-2">🏆 ¡Girando! 🏆</div>
                      <div className="text-3xl font-bold text-yellow-600">
                        {currentHighlight || '...'}
                      </div>
                    </div>
                  </div>
                )}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-3 z-10">
                  <div className="w-8 h-10 bg-red-600 clip-arrow shadow-lg"></div>
                </div>
                <div 
                  className="wheel-container w-full h-full rounded-full overflow-hidden border-8 border-gray-300 shadow-xl relative"
                  style={wheelStyle}
                >
                  <svg width="100%" height="100%" viewBox="0 0 360 360">
                    {participants.map((participant, index) => {
                      const sliceDegree = 360 / participants.length;
                      const startAngle = index * sliceDegree;
                      const endAngle = (index + 1) * sliceDegree;

                      const startRadians = (startAngle - 90) * Math.PI / 180;
                      const endRadians = (endAngle - 90) * Math.PI / 180;
                      
                      const startX = 180 + 180 * Math.cos(startRadians);
                      const startY = 180 + 180 * Math.sin(startRadians);
                      const endX = 180 + 180 * Math.cos(endRadians);
                      const endY = 180 + 180 * Math.sin(endRadians);

                      const largeArcFlag = sliceDegree <= 180 ? 0 : 1;

                      const d = [
                        `M 180 180`,
                        `L ${startX} ${startY}`,
                        `A 180 180 0 ${largeArcFlag} 1 ${endX} ${endY}`,
                        `Z`
                      ].join(' ');

                      const textRadians = (startAngle + sliceDegree / 2 - 90) * Math.PI / 180;
                      const textX = 180 + 100 * Math.cos(textRadians);
                      const textY = 180 + 100 * Math.sin(textRadians);
                      const textRotation = startAngle + sliceDegree / 2;

                      return (
                        <g key={index}>
                          <path d={d} fill={colors[index % colors.length]} stroke="#fff" strokeWidth="1" />
                          <text
                            x={textX}
                            y={textY}
                            fill="#fff"
                            fontWeight="bold"
                            fontSize="12"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                          >
                            {shortenName(participant.nombre || 'Sin nombre')}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>

              <div className="mt-8 flex justify-center relative z-40">
                <button
                  onClick={startDraw}
                  disabled={spinning || participants.length === 0}
                  className={`px-8 py-3 rounded-full text-lg font-bold shadow-lg transform hover:scale-105 transition-all ${
                    spinning || participants.length === 0
                      ? "bg-gray-400/50 backdrop-blur-sm cursor-not-allowed"
                      : "bg-gradient-to-r from-green-500/80 to-emerald-600/80 backdrop-blur-sm text-white hover:from-green-500 hover:to-emerald-600"
                  }`}
                >
                  {spinning ? "Girando..." : "¡Girar Ruleta!"}
                </button>
              </div>
            </div>

            {winner && showWinnerAnimation && (
              <div className="fixed inset-0 flex items-center justify-center z-30 pointer-events-none">
                <div className="p-6 bg-green-100 rounded-lg shadow-xl text-center border-4 border-yellow-400 animate-bounce max-w-md w-full mx-4" style={{
                  background: 'linear-gradient(135deg, #f0fff0 0%, #e6ffe6 100%)',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
                }}>
                  <h2 className="text-4xl font-extrabold text-black mb-3">¡GANADOR!</h2>
                  <p className="text-3xl font-bold mb-2 text-blue-500" style={{
                    textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                    background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    display: 'inline-block',
                    padding: '0 10px'
                  }}>{winner.nombre}</p>
                  <p className="text-gray-700">
                    Cédula: {winner.cedula ? 
                      `${winner.cedula.substring(0, 2)}${'*'.repeat(Math.max(0, winner.cedula.length - 4))}${winner.cedula.slice(-2)}` : 
                      'N/A'}
                  </p>
                  <p className="text-gray-700 mt-2">
                    Teléfono: {winner.celular ? 
                      `${winner.celular.substring(0, 2)}${'*'.repeat(Math.max(0, winner.celular.length - 4))}${winner.celular.slice(-2)}` : 
                      'N/A'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Vista normal
  return (
    <div 
      className="bg-white bg-opacity-90 py-8 px-4"
      style={{
        backgroundImage: "url('/assets/img/celeste.jpg')",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center center",
        backgroundSize: "cover",
        minHeight: "83.65vh"
      }}
      ref={containerRef}
    >
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 text-center">
          <div className="flex justify-between items-center mb-4">
            <div className="w-1/3"></div>
            <div className="w-1/3">
              <h1 className="text-4xl font-bold text-gray-800 mb-2">Sorteo de Premios</h1>
              <p className="text-gray-600">¡Gira la ruleta y descubre al ganador!</p>
            </div>
            <div className="w-1/3 flex justify-end">
              <button
                onClick={toggleFullscreen}
                className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-2"
                title="Ver en pantalla completa"
              >
                <Fullscreen />
                <span className="hidden sm:inline">Pantalla completa</span>
              </button>
            </div>
          </div>
          
          <div className="bg-white/90 p-4 rounded-lg shadow-md mb-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Filtros de Búsqueda</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Registrador
                </label>
                <select
                  value={selectedTipoRegistrador}
                  onChange={handleTipoRegistradorChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="" disabled>Seleccione un tipo</option>
                  {registradores.map((tipo) => (
                    <option key={tipo.id} value={tipo.id}>
                      {tipo.nombre}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de inicio
                </label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={handleFechaInicioChange}
                  max={fechaFin}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de fin
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={fechaFin}
                    onChange={handleFechaFinChange}
                    min={fechaInicio}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={aplicarFiltro}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 whitespace-nowrap"
                    disabled={loading}
                  >
                    {loading ? 'Cargando...' : 'Aplicar Filtros'}
                  </button>
                </div>
              </div>
            </div>
            
            {selectedTipoRegistrador && registradores.length > 0 && (
              <div className="mt-2 text-sm text-gray-600">
                {registradores.find(t => t.id.toString() === selectedTipoRegistrador)?.descripcion}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Lista de Participantes */}
          <div className="bg-white/90 p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4 text-blue-700 border-b pb-2">
              Participantes ({participants.length})
            </h2>
            {loading ? (
              <p className="text-gray-500 text-center py-8">Cargando participantes...</p>
            ) : participants.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No hay participantes para la fecha seleccionada</p>
                {winners.length > 0 && (
                  <button
                    onClick={resetWinners}
                    className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    Reiniciar lista de ganadores
                  </button>
                )}
              </div>
            ) : (
              <ul className="divide-y max-h-[600px] overflow-y-auto">
                {participants.map((p, index) => (
                  <li key={index} className="py-2 px-2 hover:bg-gray-50 rounded">
                    <div className="font-semibold">{p.nombre}</div>
                    <div className="text-sm text-gray-600">
                      <div>CI: {p.cedula}</div>
                      {p.celular && <div>Tel: {p.celular}</div>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Ruleta */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white/90 text-gray-800 p-5 rounded-lg shadow-md flex flex-col items-center relative">
              <h2 className="text-xl font-bold mb-4 text-blue-700">Ruleta de la Suerte</h2>

              {participants.length > 0 && (
                <div className="relative w-full max-w-md aspect-square">
                  {/* Indicador de nombre mientras gira */}
                  {spinning && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
                      <div className="bg-white/80 backdrop-blur-sm p-3 rounded-lg shadow-lg text-center">
                        <div className="text-xl font-bold text-blue-700 mb-1">🏆 ¡Girando! 🏆</div>
                        <div className="text-2xl font-bold text-yellow-600">
                          {currentHighlight || '...'}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-3 z-10">
                    <div className="w-6 h-8 bg-red-600 clip-arrow shadow-md"></div>
                  </div>
                  <div 
                    className="wheel-container w-full h-full rounded-full overflow-hidden border-8 border-gray-300 shadow-lg relative"
                    style={wheelStyle}
                  >
                    <svg width="100%" height="100%" viewBox="0 0 360 360">
                      {participants.map((participant, index) => {
                        const sliceDegree = 360 / participants.length;
                        const startAngle = index * sliceDegree;
                        const endAngle = (index + 1) * sliceDegree;

                        const startRadians = (startAngle - 90) * Math.PI / 180;
                        const endRadians = (endAngle - 90) * Math.PI / 180;
                        
                        const startX = 180 + 180 * Math.cos(startRadians);
                        const startY = 180 + 180 * Math.sin(startRadians);
                        const endX = 180 + 180 * Math.cos(endRadians);
                        const endY = 180 + 180 * Math.sin(endRadians);

                        const largeArcFlag = sliceDegree <= 180 ? 0 : 1;

                        const d = [
                          `M 180 180`,
                          `L ${startX} ${startY}`,
                          `A 180 180 0 ${largeArcFlag} 1 ${endX} ${endY}`,
                          `Z`
                        ].join(' ');

                        const textRadians = (startAngle + sliceDegree / 2 - 90) * Math.PI / 180;
                        const textX = 180 + 100 * Math.cos(textRadians);
                        const textY = 180 + 100 * Math.sin(textRadians);
                        const textRotation = startAngle + sliceDegree / 2;

                        return (
                          <g key={index}>
                            <path d={d} fill={colors[index % colors.length]} stroke="#fff" strokeWidth="1" />
                            <text
                              x={textX}
                              y={textY}
                              fill="#fff"
                              fontWeight="bold"
                              fontSize="12"
                              textAnchor="middle"
                              dominantBaseline="middle"
                              transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                            >
                              {shortenName(participant.nombre)}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>
              )}

              <div className="mt-6 flex gap-3">
                <button
                  onClick={startDraw}
                  disabled={spinning || participants.length === 0}
                  className={`px-6 py-3 rounded-full text-lg font-bold shadow-lg transform hover:scale-105 transition-all ${
                    spinning || participants.length === 0
                      ? "bg-gray-400/50 backdrop-blur-sm cursor-not-allowed"
                      : "bg-gradient-to-r from-green-500/80 to-emerald-600/80 backdrop-blur-sm text-white hover:from-green-500 hover:to-emerald-600"
                  }`}
                >
                  {spinning ? "Girando..." : "¡Girar Ruleta!"}
                </button>
              </div>
            </div>

            {/* Ganador */}
            <div className="bg-white/90 text-gray-800 p-5 rounded-lg shadow-md">
              <h2 className="text-xl font-bold mb-3 text-blue-700 border-b pb-2">
                Resultado del Sorteo
              </h2>

              {showWinnerAnimation && winner && (
                <div className="text-center py-6 animate-pulse">
                  <div className="text-2xl font-bold mb-2">🏆 ¡Tenemos un ganador! 🏆</div>
                  <div className="text-3xl font-bold text-yellow-600 mb-3">{winner.nombre}</div>
                  <div className="text-lg">
                    <span className="font-medium">Cédula:</span> {winner.cedula}
                    {winner.celular && (
                      <span className="ml-3">
                        <span className="font-medium">Teléfono:</span> {winner.celular}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sección de Historial de Ganadores */}
            <div className="bg-white/90 p-6 rounded-lg shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-blue-700">Historial de Ganadores</h2>
                <button 
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-blue-600 hover:text-blue-800 flex items-center">
                  {showHistory ? (
                    <>
                      <span>Ocultar</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                      </svg>
                    </>
                  ) : (
                    <>
                      <span>Mostrar</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
              
              {showHistory && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  {history.length > 0 ? (
                    <div className="max-h-80 overflow-y-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Fecha y Hora
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Ganador
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Cédula
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Teléfono
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {history.map((item) => (
                            <tr key={item.id} className={history.indexOf(item) % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatDate(item.date)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {item.winner.nombre}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {item.winner.cedula}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {item.winner.celular || 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      No hay historial de ganadores aún
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .clip-arrow {
          clip-path: polygon(50% 100%, 0 0, 100% 0);
        }
      `}</style>
    </div>
  );
}
