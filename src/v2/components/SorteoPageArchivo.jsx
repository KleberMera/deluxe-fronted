import React, { useState, useEffect, useRef } from "react";
import { Fullscreen, FullscreenExit, CloudUpload, Facebook } from '@mui/icons-material';
import * as XLSX from 'xlsx';

// Función para enmascarar teléfono
const maskPhone = (phone) => {
  if (!phone) return '';
  const str = phone.toString();
  if (str.length <= 4) return '*'.repeat(str.length);
  if (str.length <= 6) return str[0] + '*'.repeat(str.length - 2) + str[str.length - 1];
  return str.slice(0, 2) + '*'.repeat(str.length - 4) + str.slice(-2);
};

export default function SorteoPageArchivo() {
  // Estado para participantes
  const [allParticipants, setAllParticipants] = useState([]);
  const [availableParticipants, setAvailableParticipants] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('sorteo_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [winner, setWinner] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [currentHighlight, setCurrentHighlight] = useState('');
  const spinDuration = 5000;
  const [showWinnerAnimation, setShowWinnerAnimation] = useState(false);
  const [winners, setWinners] = useState(() => {
    const saved = localStorage.getItem('sorteo_winners');
    return saved ? JSON.parse(saved) : [];
  });
  const [showHistory, setShowHistory] = useState(true);
  const [excelFile, setExcelFile] = useState(null);
  const fileInputRef = useRef(null);
  const [manualParticipants, setManualParticipants] = useState([]);
  const [showAddParticipantModal, setShowAddParticipantModal] = useState(false);
  const [newParticipantName, setNewParticipantName] = useState('');
  const [showManualParticipantsList, setShowManualParticipantsList] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);
  
  // Contador de giros para la lógica especial
  const [spinCount, setSpinCount] = useState(0);

  // Save winners to localStorage
  useEffect(() => {
    localStorage.setItem('sorteo_winners', JSON.stringify(winners));
  }, [winners]);
  
  useEffect(() => {
    localStorage.setItem('sorteo_history', JSON.stringify(history));
  }, [history]);

  // Función auxiliar para normalizar nombres de columnas
  const normalizeColumnName = (name) => {
    if (!name) return '';
    return name.toString().trim().toLowerCase();
  };

  const getColumnValue = (row, ...possibleNames) => {
    const normalizedPossibleNames = possibleNames.map(name => normalizeColumnName(name));
    const rowKeys = Object.keys(row).map(key => normalizeColumnName(key));
    
    for (const possibleName of normalizedPossibleNames) {
      const keyIndex = rowKeys.indexOf(possibleName);
      if (keyIndex !== -1) {
        const actualKey = Object.keys(row)[keyIndex];
        const value = row[actualKey];
        return value ? value.toString().trim() : '';
      }
    }
    return '';
  };

  const columnExists = (rows, ...possibleNames) => {
    if (rows.length === 0) return false;
    const normalizedPossibleNames = possibleNames.map(name => normalizeColumnName(name));
    const rowKeys = Object.keys(rows[0]).map(key => normalizeColumnName(key));
    return normalizedPossibleNames.some(name => rowKeys.includes(name));
  };

  // Parsear archivo Excel
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(worksheet);

        // Detectar columnas
        const hasCedulaColumn = columnExists(rows, 'cedula', 'cédula');
        const hasCelularColumn = columnExists(rows, 'celular', 'telefono');
        const hasComentariosColumn = columnExists(rows, 'comentarios', 'comentario');
        const hasUrlsColumn = columnExists(rows, 'urls', 'url', 'perfil');
        const hasBarriosColumn = columnExists(rows, 'barrios', 'barrio', 'localidad');

        const participantesDelArchivo = rows
          .map((row, index) => {
            const nombre = getColumnValue(row, 'nombre', 'nombres', 'name');

            if (!nombre) {
              console.warn(`Fila ${index + 1} no tiene nombre`);
              return null;
            }

            const cedulaDelArchivo = hasCedulaColumn ? getColumnValue(row, 'cedula', 'cédula') : '';
            const cedula = cedulaDelArchivo || `SN-${index}`;

            const participant = {
              id: `excel-${index}`,
              nombre,
              cedula,
              cedulaDelArchivo: !!cedulaDelArchivo,
              fecha_registro: new Date().toISOString(),
              tipo_registrador: 'Archivo',
              contador: 1,
              sourceMode: 'archivo'
            };

            if (hasCelularColumn) {
              participant.celular = getColumnValue(row, 'celular', 'telefono');
            }
            if (hasComentariosColumn) {
              participant.comentarios = getColumnValue(row, 'comentarios', 'comentario');
            }
            if (hasUrlsColumn) {
              participant.urls = getColumnValue(row, 'urls', 'url', 'perfil');
            }
            if (hasBarriosColumn) {
              participant.barrios = getColumnValue(row, 'barrios', 'barrio', 'localidad');
            }

            return participant;
          })
          .filter(p => p !== null);

        if (participantesDelArchivo.length === 0) {
          alert('El archivo no contiene datos válidos. Asegúrate de que tenga al menos la columna: nombre.');
          return;
        }

        // Resetear contador de giros al cargar nuevo archivo
        setSpinCount(0);
        setAllParticipants(participantesDelArchivo);
        setAvailableParticipants(participantesDelArchivo);
        setParticipants(participantesDelArchivo);
        setExcelFile(file);
        setManualParticipants([]);
        alert(`Se cargaron ${participantesDelArchivo.length} participantes del archivo`);
      } catch (error) {
        console.error('Error al procesar el archivo Excel:', error);
        alert('Error al procesar el archivo. Asegúrate de que sea un archivo Excel válido.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Limpiar archivo
  const handleClearFile = () => {
    setExcelFile(null);
    setAllParticipants([]);
    setAvailableParticipants([]);
    setParticipants([]);
    setWinners([]);
    setHistory([]);
    setManualParticipants([]);
    setSpinCount(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Agregar participante manual
  const handleAddManualParticipant = () => {
    if (!newParticipantName.trim()) {
      alert('Por favor ingresa un nombre');
      return;
    }

    const newParticipant = {
      id: `manual-${Date.now()}`,
      nombre: newParticipantName.trim(),
      cedula: `SN-manual-${Date.now()}`,
      celular: '',
      cedulaDelArchivo: false,
      fecha_registro: new Date().toISOString(),
      tipo_registrador: 'Manual',
      contador: 1,
      sourceMode: 'archivo'
    };

    setManualParticipants(prev => [...prev, newParticipant]);
    setNewParticipantName('');
    setShowAddParticipantModal(false);

    const allCombined = [...allParticipants, newParticipant];
    const cedulasGanadoras = new Set(winners.map(w => w.cedula));
    const participantesSinGanadores = allCombined.filter(
      p => !cedulasGanadoras.has(p.cedula)
    );
    
    setAllParticipants(allCombined);
    setAvailableParticipants(participantesSinGanadores);
    setParticipants(participantesSinGanadores);
  };

  // Eliminar participante manual
  const handleRemoveManualParticipant = (participantId) => {
    setManualParticipants(prev => prev.filter(p => p.id !== participantId));
    
    const updated = allParticipants.filter(p => p.id !== participantId);
    const cedulasGanadoras = new Set(winners.map(w => w.cedula));
    const participantesSinGanadores = updated.filter(
      p => !cedulasGanadoras.has(p.cedula)
    );
    
    setAllParticipants(updated);
    setAvailableParticipants(participantesSinGanadores);
    setParticipants(participantesSinGanadores);
  };

  // Pantalla completa
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen();
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.error(`Error with fullscreen: ${err.message}`);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Enter' && !event.repeat) {
        event.preventDefault();
        startDraw();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen, startDraw]);

  // Colores para la ruleta
  const colors = [
    "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF",
    "#FF9F40", "#8AC926", "#1982C4", "#6A4C93", "#F15BB5",
    "#FF5733", "#33FF57", "#5733FF", "#33FFEC", "#EC33FF",
    "#FFEC33", "#FF33A8", "#33A8FF", "#A8FF33", "#A833FF"
  ];

  const MAX_VISUAL_SEGMENTS = 300;

  let visualParticipants = participants;
  let visualMap = null;
  if (participants.length > MAX_VISUAL_SEGMENTS) {
    const step = participants.length / MAX_VISUAL_SEGMENTS;
    visualParticipants = [];
    visualMap = [];
    for (let i = 0; i < MAX_VISUAL_SEGMENTS; i++) {
      const idx = Math.floor(i * step);
      visualParticipants.push(participants[idx]);
      visualMap.push(idx);
    }
  }

  const wheelStyle = {
    transform: `rotate(${rotation}deg)`,
    transition: spinning ? 'none' : 'transform 0.1s ease-out',
    backgroundColor: 'white'
  };

  // Actualizar participantes disponibles cuando cambian ganadores
  useEffect(() => {
    if (allParticipants.length === 0) return;
    
    const participantesSinGanadores = allParticipants.filter(
      p => !winners.some(w => w.cedula === p.cedula)
    );
    
    setAvailableParticipants(participantesSinGanadores);
    setParticipants(participantesSinGanadores);
  }, [winners, allParticipants]);

  function startDraw() {
    if (spinning) {
      alert('La ruleta ya está girando');
      return;
    }
    
    if (availableParticipants.length === 0) {
      alert('No hay participantes disponibles para el sorteo.');
      return;
    }
    
    // Incrementar el contador de giros
    const currentSpin = spinCount + 1;
    setSpinCount(currentSpin);
    
    let selectedWinner = null;
    
    // Lógica especial para los primeros 11 giros
    if (currentSpin === 5) {
      // 5to giro: gana el ÚLTIMO participante de la lista
      selectedWinner = availableParticipants[availableParticipants.length - 1];
    } else if (currentSpin === 8) {
      // 8vo giro: gana el PENÚLTIMO participante
      selectedWinner = availableParticipants[availableParticipants.length - 2];
    } else if (currentSpin === 11) {
      // 11vo giro: gana el ANTEPENÚLTIMO participante
      selectedWinner = availableParticipants[availableParticipants.length - 3];
    } else {
      // Para el resto de giros (12 en adelante): selección aleatoria normal
      const randomIndex = Math.floor(Math.random() * availableParticipants.length);
      selectedWinner = availableParticipants[randomIndex];
    }
    
    // Verificar que el ganador seleccionado existe
    if (!selectedWinner) {
      alert('No se pudo seleccionar un ganador. Verifica que haya suficientes participantes.');
      setSpinCount(currentSpin - 1); // Revertir contador
      return;
    }
    
    setSpinning(true);
    setWinner(null);
    setShowWinnerAnimation(false);
    setCurrentHighlight('');
    
    // Calcular la rotación para la ruleta
    const sliceDegree = 360 / allParticipants.length;
    const winnerPosition = allParticipants.findIndex(p => p.cedula === selectedWinner.cedula);
    const targetDegree = 360 - (sliceDegree * winnerPosition) - (sliceDegree / 2);
    const targetRotation = (360 * 10) + targetDegree;
    
    const startTime = Date.now();
    const startRotation = rotation;
    const totalRotation = startRotation + targetRotation;
    
    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / spinDuration, 1);
      const easeOutProgress = 1 - Math.pow(1 - progress, 3);
      const currentRotation = startRotation + (totalRotation - startRotation) * easeOutProgress;
      
      setRotation(currentRotation);
      updateHighlight(currentRotation);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Animation complete - el ganador ya está seleccionado
        const winnerWithFilter = {
          ...selectedWinner,
          fechaSorteo: new Date().toISOString(),
          numeroGiro: currentSpin // Guardar el número de giro para referencia
        };
        
        setWinners(prevWinners => [...prevWinners, winnerWithFilter]);
        
        setAvailableParticipants(prev => 
          prev.filter(p => p.cedula !== selectedWinner.cedula)
        );
        
        setParticipants(prev => 
          prev.filter(p => p.cedula !== selectedWinner.cedula)
        );
        
        setAllParticipants(prev => 
          prev.filter(p => p.cedula !== selectedWinner.cedula)
        );
        
        const newHistoryEntry = {
          id: Date.now(),
          winner: selectedWinner,
          date: new Date().toISOString(),
          numeroGiro: currentSpin
        };
        
        setHistory(prev => [...prev, newHistoryEntry]);
        
        setWinner(selectedWinner);
        setShowWinnerAnimation(true);
        setSpinning(false);
      }
    };
    
    requestAnimationFrame(animate);
  }

  const updateHighlight = (angle) => {
    if (participants.length === 0) return;
    const useVisual = participants.length > MAX_VISUAL_SEGMENTS;
    const arr = useVisual ? visualParticipants : participants;
    const sliceDegree = 360 / arr.length;
    const normalizedAngle = ((angle % 360) + 360) % 360;
    const index = Math.floor(normalizedAngle / sliceDegree);
    const currentIndex = (arr.length - 1 - index) % arr.length;
    setCurrentHighlight(arr[currentIndex]?.nombre || '');
  };
  
  const shortenName = (name) => {
    if (!name) return '';
    if (name.length > 15) {
      return name.substring(0, 13) + "...";
    }
    return name;
  };

  const resetWinners = () => {
    if (window.confirm('¿Estás seguro de que deseas reiniciar la lista de ganadores?')) {
      setWinners([]);
      setHistory([]);
      setSpinCount(0); // Resetear contador de giros
      setAllParticipants(prev => {
        const manualParticipantsList = manualParticipants;
        const excelParticipants = allParticipants.filter(p => p.id.startsWith('excel-'));
        return [...excelParticipants, ...manualParticipantsList];
      });
    }
  };
  
  const deleteWinner = (historyId, winnerCedula) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este ganador?')) {
      setHistory(prev => prev.filter(item => item.id !== historyId));
      setWinners(prev => prev.filter(w => w.cedula !== winnerCedula));
      // No resetear el contador de giros al eliminar un ganador
    }
  };
  
  const exportWinnersToExcel = () => {
    if (history.length === 0) {
      alert('No hay ganadores para exportar');
      return;
    }
    
    const data = history.map(item => ({
      'N° Giro': item.numeroGiro || '-',
      'Fecha y Hora': formatDate(item.date),
      'Ganador': item.winner.nombre,
      'Cédula': item.winner.cedula || '-',
      'Teléfono': item.winner.celular || '-',
      'Comentario': item.winner.comentarios || '-',
      'Barrio': item.winner.barrios || '-'
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ganadores');
    XLSX.writeFile(workbook, `ganadores_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

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

  // Estilos para pantalla completa
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
    backgroundImage: "url('/assets/img/ruletafondo.webp')",
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center center',
    backgroundSize: 'cover'
  } : {};

  // Vista de pantalla completa (similar pero con la nueva lógica)
  if (isFullscreen) {
    return (
      <div ref={containerRef} style={fullscreenStyles}>
        <div className="absolute top-4 right-4 z-50">
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-purple-500/30 backdrop-blur-md rounded-full hover:bg-purple-500/50 transition-colors border border-purple-300/40"
            title="Salir de pantalla completa"
          >
            <FullscreenExit />
          </button>
        </div>

        <div className="absolute bottom-4 right-4 z-40">
          <div className="px-4 py-2 rounded-full bg-black/45 backdrop-blur-md border border-white/20 text-white shadow-xl">
            <span className="text-sm uppercase tracking-wide text-white/80">Ganadores</span>
            <span className="ml-3 text-2xl font-black text-yellow-300">{winners.length}</span>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center flex-grow w-full max-w-4xl px-4">
          <div className="w-full max-w-2xl relative">
            <div className="p-6 mb-6">
              <div className="relative w-full aspect-square">
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
                    {(participants.length > MAX_VISUAL_SEGMENTS ? visualParticipants : participants).map((participant, index) => {
                      const arr = participants.length > MAX_VISUAL_SEGMENTS ? visualParticipants : participants;
                      const sliceDegree = 360 / arr.length;
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
              <div className="fixed inset-0 flex items-center justify-center z-30 pointer-events-auto">
                <div className="p-6 bg-green-100 rounded-lg shadow-xl text-center border-4 border-yellow-400 max-w-md w-full mx-4" style={{
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
                  
                  <div className="mt-4 space-y-2 text-gray-700">
                    {winner.cedulaDelArchivo && (
                      <p>Cédula: {winner.cedula}</p>
                    )}
                    {winner.celular && (
                      <p>Teléfono: {winner.celular}</p>
                    )}
                    {winner.comentarios !== undefined && (
                      <p>Comentario: {winner.comentarios || 'Sin Comentario'}</p>
                    )}
                    {winner.barrios !== undefined && (
                      <p>Barrio: {winner.barrios || 'Sin especificar'}</p>
                    )}
                  </div>
                  
                  {winner.urls && (
                    <div className="mt-6 flex justify-center">
                      <a
                        href={winner.urls}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold transition-all hover:shadow-lg transform hover:scale-105 border-2 border-blue-500"
                        title="Ver perfil en Facebook"
                      >
                        <Facebook size={24} />
                        <span>Ver Perfil</span>
                      </a>
                    </div>
                  )}
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
      className="py-8 px-4 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #1a0033 0%, #2d1b69 50%, #0f0a2e 100%)',
        minHeight: "83.65vh"
      }}
      ref={containerRef}
    >
      {/* Efecto de fondo animado */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl"></div>
      </div>
      
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="mb-8 text-center">
          <div className="flex justify-between items-center mb-4">
            <div className="w-1/3"></div>
            <div className="w-1/3">
              <h1 
                className="text-4xl font-black text-white mb-2 drop-shadow-lg"
                style={{
                  fontFamily: "'Doctor Glitch', sans-serif",
                  textShadow: '3px 3px 6px rgba(0, 0, 0, 0.5), 0 0 20px rgba(255, 255, 255, 0.3)',
                  letterSpacing: '2px'
                }}
              >
                SORTEO DE PREMIOS
              </h1>
              <p className="text-pink-100">¡Gira la ruleta y descubre al ganador!</p>
              <p className="text-yellow-300 text-sm mt-1">
                Giros: {spinCount} | 
                {spinCount < 5 && <span className="ml-1">Próximo ganador especial: #{spinCount + 1}</span>}
                {spinCount === 4 && <span className="ml-1 text-green-300">⚡ ¡ÚLTIMO de la lista!</span>}
                {spinCount === 5 && <span className="ml-1 text-orange-300">⚡ Siguiente: PENÚLTIMO</span>}
                {spinCount === 7 && <span className="ml-1 text-orange-300">⚡ ¡PENÚLTIMO de la lista!</span>}
                {spinCount === 8 && <span className="ml-1 text-red-300">⚡ Siguiente: ANTEPENÚLTIMO</span>}
                {spinCount === 10 && <span className="ml-1 text-red-300">⚡ ¡ANTEPENÚLTIMO de la lista!</span>}
                {spinCount >= 11 && <span className="ml-1 text-blue-300">🎲 Sorteo aleatorio</span>}
              </p>
            </div>
            <div className="w-1/3 flex justify-end">
              <button
                onClick={toggleFullscreen}
                className="p-2 bg-purple-500/30 backdrop-blur-md text-pink-100 rounded-lg hover:bg-purple-500/50 transition-colors flex items-center gap-2 border border-purple-300/40"
                title="Ver en pantalla completa"
              >
                <Fullscreen />
                <span className="hidden sm:inline">Pantalla completa</span>
              </button>
            </div>
          </div>
          
          {/* Sección de carga de archivo */}
          <div className="bg-white/95 backdrop-blur-md p-4 rounded-lg shadow-lg mb-6 border border-white/40">
            <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center gap-2">
              <CloudUpload />
              Cargar Archivo Excel
            </h3>
            
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex flex-col gap-3">
                <label className="block text-sm font-medium text-gray-700">
                  Subir archivo Excel
                  <div className="text-xs text-gray-600 mt-1 font-normal">
                    Obligatoria: <span className="font-semibold">nombres</span> | 
                    Opcionales: cedula, celular, comentarios, urls, barrios
                  </div>
                </label>
                <div className="flex gap-2 flex-wrap">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="flex-1 min-w-[200px] px-3 py-2 border-2 border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                  {excelFile && (
                    <>
                      <button
                        onClick={handleClearFile}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors font-semibold whitespace-nowrap"
                      >
                        Limpiar
                      </button>
                      <button
                        onClick={() => setShowAddParticipantModal(true)}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors font-semibold whitespace-nowrap"
                      >
                        + Agregar
                      </button>
                      <button
                        onClick={() => setShowManualParticipantsList(!showManualParticipantsList)}
                        className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-md transition-colors font-semibold whitespace-nowrap"
                      >
                        {showManualParticipantsList ? 'Ocultar' : 'Ver'} Listado
                      </button>
                    </>
                  )}
                </div>
                {excelFile && (
                  <p className="text-sm text-green-600 font-medium">✓ Archivo: {excelFile.name}</p>
                )}

                {/* Sección de participantes manuales */}
                {excelFile && showManualParticipantsList && (
                  <div className="mt-4 pt-4 border-t border-blue-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Participantes Agregados Manualmente</h4>

                    {manualParticipants.length > 0 ? (
                      <div className="bg-white rounded-md p-3 border border-blue-200 max-h-40 overflow-y-auto">
                        {manualParticipants.map((p) => (
                          <div key={p.id} className="flex justify-between items-center py-2 px-2 hover:bg-blue-50 rounded text-sm">
                            <span className="font-medium text-gray-700">{p.nombre}</span>
                            <button
                              onClick={() => handleRemoveManualParticipant(p.id)}
                              className="text-red-500 hover:text-red-700 font-semibold text-xs"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">No hay participantes agregados manualmente</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Lista de Participantes */}
          <div className="bg-white/95 backdrop-blur-md p-6 rounded-lg shadow-lg border border-white/40">
            <h2 className="text-xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 border-b pb-2 flex items-center gap-2">
              Participantes ({participants.length})
            </h2>
            {participants.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No hay participantes cargados</p>
                {winners.length > 0 && (
                  <button
                    onClick={resetWinners}
                    className="px-4 py-2 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-all"
                  >
                    Reiniciar lista de ganadores
                  </button>
                )}
              </div>
            ) : (
              <ul className="divide-y max-h-[600px] overflow-y-auto">
                {participants.map((p, index) => {
                  // Marcar los últimos 3 participantes
                  // const isLast = index === participants.length - 1;
                  // const isPenultimate = index === participants.length - 2;
                  // const isAntepenultimate = index === participants.length - 3;
                  // let highlightClass = '';
                  // if (isLast) highlightClass = 'bg-yellow-100 border-l-4 border-yellow-500';
                  // else if (isPenultimate) highlightClass = 'bg-orange-50 border-l-4 border-orange-400';
                  // else if (isAntepenultimate) highlightClass = 'bg-red-50 border-l-4 border-red-400';
                  
                  return (
                       <li key={index} className={`py-2 px-2 hover:bg-gray-50 rounded `}>
                     {/* <li key={index} className={`py-2 px-2 hover:bg-gray-50 rounded ${highlightClass}`}> */}
                      <div className="font-semibold flex items-center gap-2">
                        {p.nombre}
                        {/* {isLast && <span className="text-xs bg-yellow-500 text-white px-2 py-0.5 rounded-full">ÚLTIMO</span>}
                        {isPenultimate && <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">PENÚLTIMO</span>}
                        {isAntepenultimate && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">ANTEPENÚLTIMO</span>} */}
                      </div>
                      <div className="text-sm text-gray-600">
                        <div>CI: {p.cedula}</div>
                        {p.celular && <div>Tel: {p.celular}</div>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Ruleta y Ganador */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white/95 backdrop-blur-md text-gray-800 p-5 rounded-lg shadow-lg border border-white/40 flex flex-col items-center relative">
              <h2 className="text-xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">Ruleta de la Suerte</h2>

              {/* Indicador de giro especial */}
              {spinCount === 4 && (
                <div className="mb-3 px-4 py-2 bg-yellow-100 border-2 border-yellow-400 rounded-lg text-yellow-800 font-bold animate-pulse">
                  ⚡ ¡Próximo ganador será el ÚLTIMO de la lista! (Giro #5)
                </div>
              )}
              {spinCount === 7 && (
                <div className="mb-3 px-4 py-2 bg-orange-100 border-2 border-orange-400 rounded-lg text-orange-800 font-bold animate-pulse">
                  ⚡ ¡Próximo ganador será el PENÚLTIMO de la lista! (Giro #8)
                </div>
              )}
              {spinCount === 10 && (
                <div className="mb-3 px-4 py-2 bg-red-100 border-2 border-red-400 rounded-lg text-red-800 font-bold animate-pulse">
                  ⚡ ¡Próximo ganador será el ANTEPENÚLTIMO de la lista! (Giro #11)
                </div>
              )}

              {participants.length > 0 && (
                <div className="relative w-full max-w-md aspect-square">
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
                      : "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white"
                  }`}
                >
                  {spinning ? "Girando..." : "¡Girar Ruleta!"}
                </button>
              </div>
            </div>

            {/* Ganador */}
            <div className="bg-white/95 backdrop-blur-md text-gray-800 p-5 rounded-lg shadow-lg border border-white/40">
              <h2 className="text-xl font-bold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 border-b pb-2">
                Resultado del Sorteo
              </h2>

              {showWinnerAnimation && winner && (
                <div className="text-center py-6">
                  <div className="text-2xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">🏆 ¡Tenemos un ganador! 🏆</div>
                  <div className="text-3xl font-bold text-pink-600 mb-3">{winner.nombre}</div>
                  
                  <div className="text-lg space-y-2 mt-4">
                    {winner.cedulaDelArchivo && (
                      <div>
                        <span className="font-medium">Cédula:</span> {winner.cedula}
                      </div>
                    )}
                    {winner.celular && (
                      <div>
                        <span className="font-medium">Teléfono:</span> {winner.celular}
                      </div>
                    )}
                    {winner.comentarios !== undefined && (
                      <div>
                        <span className="font-medium">Comentario:</span> {winner.comentarios || 'Sin Comentario'}
                      </div>
                    )}
                    {winner.barrios !== undefined && (
                      <div>
                        <span className="font-medium">Barrio:</span> {winner.barrios || 'Sin especificar'}
                      </div>
                    )}
                    {winner.urls && (
                      <div className="mt-6 flex justify-center">
                        <a
                          href={winner.urls}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold transition-all hover:shadow-lg transform hover:scale-105 border-2 border-blue-500"
                          title="Ver perfil en Facebook"
                        >
                          <Facebook size={24} />
                          <span>Ver Perfil</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Historial de Ganadores */}
            <div className="bg-white/95 backdrop-blur-md p-6 rounded-lg shadow-lg border border-white/40">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">Historial de Ganadores</h2>
                <div className="flex gap-2 flex-wrap">
                  {history.length > 0 && (
                    <>
                      <button 
                        onClick={exportWinnersToExcel}
                        className="px-3 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded-md text-sm font-semibold transition-colors"
                      >
                        Exportar Excel
                      </button>
                      <button 
                        onClick={resetWinners}
                        className="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded-md text-sm font-semibold transition-colors"
                      >
                        Limpiar Todo
                      </button>
                    </>
                  )}
                  <button 
                    onClick={() => setShowHistory(!showHistory)}
                    className="text-purple-600 hover:text-purple-800 flex items-center transition-colors">
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
              </div>
              
              {showHistory && (
                <div className="border border-purple-200 rounded-lg overflow-hidden">
                  {history.length > 0 ? (
                    <div className="max-h-80 overflow-y-auto">
                      <table className="min-w-full divide-y divide-purple-200">
                        <thead className="bg-purple-50/50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">
                              N° Giro
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">
                              Fecha y Hora
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">
                              Ganador
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">
                              Cédula
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">
                              Teléfono
                            </th>
                            {history.some(item => item.winner.comentarios !== undefined) && (
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">
                                Comentario
                              </th>
                            )}
                            {history.some(item => item.winner.barrios !== undefined) && (
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">
                                Barrio
                              </th>
                            )}
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">
                              Acciones
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-purple-200">
                          {history.map((item) => {
                            // Colores especiales para los primeros 11 giros
                            let rowClass = '';
                            if (item.numeroGiro === 5) rowClass = 'bg-yellow-50';
                            else if (item.numeroGiro === 8) rowClass = 'bg-orange-50';
                            else if (item.numeroGiro === 11) rowClass = 'bg-red-50';
                            
                            return (
                              <tr key={item.id} className={rowClass || (history.indexOf(item) % 2 === 0 ? 'bg-white' : 'bg-purple-50/30')}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                                  #{item.numeroGiro || '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {formatDate(item.date)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {item.winner.nombre}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                  {item.winner.cedula ? item.winner.cedula : '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                  {item.winner.celular || '-'}
                                </td>
                                {history.some(h => h.winner.comentarios !== undefined) && (
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                    {item.winner.comentarios || '-'}
                                  </td>
                                )}
                                {history.some(h => h.winner.barrios !== undefined) && (
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                    {item.winner.barrios || '-'}
                                  </td>
                                )}
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  <button
                                    onClick={() => deleteWinner(item.id, item.winner.cedula)}
                                    className="text-red-500 hover:text-red-700 font-semibold text-xs"
                                  >
                                    Eliminar
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
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

      {/* Modal para agregar participante */}
      {showAddParticipantModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4 text-gray-800">Agregar Participante</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del participante
              </label>
              <input
                type="text"
                value={newParticipantName}
                onChange={(e) => setNewParticipantName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddManualParticipant()}
                placeholder="Ingresa el nombre"
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                autoFocus
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowAddParticipantModal(false);
                  setNewParticipantName('');
                }}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-md transition-colors font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddManualParticipant}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors font-semibold"
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .clip-arrow {
          clip-path: polygon(50% 100%, 0 0, 100% 0);
        }
      `}</style>
    </div>
  );
}