import React, { useState } from 'react';
import { Search, Send, User, CheckCircle, XCircle, AlertCircle, FileText, Phone, CreditCard, RefreshCw, Clock, HelpCircle } from 'lucide-react';
import WhatsAppStatus from './WhatsAppStatus';
import InstruccionesReenvio from './InstruccionesReenvio';
import environments from '../environment/environment';

const ReenvioTablas = ({ isResending, setIsResending }) => {
  const [searchData, setSearchData] = useState({
    identifier: '',
    identifierType: 'cedula' // 'cedula' o 'phone'
  });
  const [searchResult, setSearchResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [recentActivity, setRecentActivity] = useState([]);
  const [showInstructions, setShowInstructions] = useState(false);

  const BASE_URL = environments.apiUrl;

  // Agregar actividad reciente
  const addRecentActivity = (activity) => {
    setRecentActivity(prev => [
      {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        ...activity
      },
      ...prev.slice(0, 4) // Mantener solo las últimas 5 actividades
    ]);
  };

  // Limpiar mensajes después de 5 segundos
  React.useEffect(() => {
    if (error || successMessage) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, successMessage]);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setSearchResult(null);

    try {
      const response = await fetch(`${BASE_URL}/whatsapp-otp/search-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: searchData.identifier.trim(),
          identifierType: searchData.identifierType
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // La API devuelve success: true cuando encuentra al usuario
        if (result.success && result.user) {
          // Transformar la respuesta al formato esperado por el componente
          const transformedResult = {
            found: true,
            user: {
              id: result.user.id,
              firstName: result.user.firstName,
              lastName: result.user.lastName,
              phone: result.user.phone,
              idCard: result.user.idCard,
              hasTable: !!result.user.table // Si tiene tabla, hasTable es true
            },
            table: result.user.table ? {
              id: result.user.table.id,
              code: result.user.table.tableCode,
              fileName: result.user.table.fileName,
              fileUrl: result.user.table.fileUrl,
              createdAt: result.timestamp,
              delivered: true // Asumimos que si existe la tabla, está entregada
            } : null
          };
          
          setSearchResult(transformedResult);
          addRecentActivity({
            type: 'search',
            status: 'found',
            identifier: searchData.identifier,
            identifierType: searchData.identifierType,
            userName: `${result.user.firstName} ${result.user.lastName}`
          });
        } else {
          // Usuario no encontrado
          setSearchResult({
            found: false,
            user: null,
            table: null
          });
          setError('Usuario no encontrado en la base de datos');
          addRecentActivity({
            type: 'search',
            status: 'not_found',
            identifier: searchData.identifier,
            identifierType: searchData.identifierType
          });
        }
      } else {
        setError(result.message || 'Error al buscar usuario');
        addRecentActivity({
          type: 'search',
          status: 'error',
          identifier: searchData.identifier,
          identifierType: searchData.identifierType
        });
      }
    } catch (err) {
      setError('Error de conexión. Intenta nuevamente.');
      console.error('Error searching user:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    // Activar pausa de actualizaciones automáticas
    if (setIsResending) {
      setIsResending(true);
    }

    try {
      const response = await fetch(`${BASE_URL}/whatsapp-otp/resend-table`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: searchData.identifier.trim(),
          identifierType: searchData.identifierType,
          userId: searchResult.user.id // Usar el ID del usuario
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccessMessage('¡Tabla reenviada exitosamente por WhatsApp!');
        addRecentActivity({
          type: 'resend',
          status: 'success',
          identifier: searchData.identifier,
          identifierType: searchData.identifierType,
          userName: searchResult?.user ? `${searchResult.user.firstName} ${searchResult.user.lastName}` : 'Usuario'
        });
        // Actualizar el resultado de búsqueda para mostrar el estado actualizado
        if (searchResult) {
          setSearchResult({
            ...searchResult,
            lastResent: new Date().toISOString()
          });
        }
      } else {
        setError(result.message || 'Error al reenviar tabla');
        addRecentActivity({
          type: 'resend',
          status: 'error',
          identifier: searchData.identifier,
          identifierType: searchData.identifierType,
          userName: searchResult?.user ? `${searchResult.user.firstName} ${searchResult.user.lastName}` : 'Usuario'
        });
      }
    } catch (err) {
      setError('Error de conexión. Intenta nuevamente.');
      console.error('Error resending table:', err);
    } finally {
      setResendLoading(false);
      // Reactivar actualizaciones automáticas
      if (setIsResending) {
        setIsResending(false);
      }
    }
  };

  const clearSearch = () => {
    setSearchData({ identifier: '', identifierType: 'cedula' });
    setSearchResult(null);
    setError(null);
    setSuccessMessage(null);
  };

  const handleQuickSearch = (type) => {
    // Ejemplos para pruebas rápidas
    const examples = {
      cedula: '1234567890',
      phone: '593987654321'
    };
    
    setSearchData({
      identifier: examples[type],
      identifierType: type
    });
  };

  const formatPhone = (phone) => {
    if (!phone) return '';
    // Formatear número de teléfono para mejor visualización
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 mb-8 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Send className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Reenvío de Tablas BINGO</h1>
                <p className="text-white/90 text-sm">Busca y reenvía tablas de BINGO por WhatsApp</p>
              </div>
            </div>
            <button
              onClick={() => setShowInstructions(true)}
              className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-all duration-300 flex items-center"
            >
              <HelpCircle className="mr-2" size={16} />
              Ayuda
            </button>
          </div>
        </div>

        <InstruccionesReenvio 
          isOpen={showInstructions} 
          onClose={() => setShowInstructions(false)} 
        />

        {/* Formulario de búsqueda */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center">
              <Search className="mr-2" size={20} />
              Buscar Usuario
            </h2>
            <div className="mt-3 sm:mt-0 sm:max-w-xs">
              <WhatsAppStatus />
            </div>
          </div>

          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {searchData.identifierType === 'cedula' ? 'Número de Cédula' : 'Número de Teléfono'}
                </label>
                <input
                  type="text"
                  value={searchData.identifier}
                  onChange={(e) => setSearchData({...searchData, identifier: e.target.value})}
                  placeholder={searchData.identifierType === 'cedula' ? 'Ej: 1234567890' : 'Ej: 593987654321'}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Búsqueda
                </label>
                <select
                  value={searchData.identifierType}
                  onChange={(e) => setSearchData({...searchData, identifierType: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="cedula">Cédula</option>
                  <option value="phone">Teléfono</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading || !searchData.identifier.trim()}
                className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              >
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 animate-spin" size={16} />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search className="mr-2" size={16} />
                    Buscar Usuario
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={clearSearch}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-300"
              >
                Limpiar
              </button>

              {/* Botones de prueba rápida */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickSearch('cedula')}
                  className="px-3 py-2 bg-blue-50 text-blue-600 text-sm rounded-lg hover:bg-blue-100 transition-all duration-300"
                  title="Prueba con cédula de ejemplo"
                >
                  Test Cédula
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSearch('phone')}
                  className="px-3 py-2 bg-green-50 text-green-600 text-sm rounded-lg hover:bg-green-100 transition-all duration-300"
                  title="Prueba con teléfono de ejemplo"
                >
                  Test Teléfono
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Mensajes de error y éxito */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center">
            <XCircle className="text-red-500 mr-3" size={20} />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center">
            <CheckCircle className="text-green-500 mr-3" size={20} />
            <p className="text-green-700">{successMessage}</p>
          </div>
        )}

        {/* Resultados de búsqueda */}
        {searchResult && (
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <User className="mr-2" size={20} />
              Resultado de Búsqueda
            </h3>

            {searchResult.found ? (
              <div className="space-y-6">
                {/* Información del usuario */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                      <User className="mr-2 text-blue-500" size={18} />
                      Información del Usuario
                    </h4>
                    <div className="space-y-2">
                      <p className="text-sm">
                        <span className="font-medium text-gray-600">Nombre:</span> {searchResult.user.firstName} {searchResult.user.lastName}
                      </p>
                      <p className="text-sm flex items-center">
                        <CreditCard className="mr-2 text-gray-400" size={14} />
                        <span className="font-medium text-gray-600">Cédula:</span> {searchResult.user.idCard}
                      </p>
                      <p className="text-sm flex items-center">
                        <Phone className="mr-2 text-gray-400" size={14} />
                        <span className="font-medium text-gray-600">Teléfono:</span> {formatPhone(searchResult.user.phone)}
                      </p>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-600">Estado:</span>
                        {searchResult.user.hasTable ? (
                          <span className="flex items-center text-green-600 text-sm">
                            <CheckCircle className="mr-1" size={14} />
                            Tiene tabla asignada
                          </span>
                        ) : (
                          <span className="flex items-center text-red-600 text-sm">
                            <XCircle className="mr-1" size={14} />
                            Sin tabla asignada
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Información de la tabla */}
                  {searchResult.table && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                        <FileText className="mr-2 text-green-500" size={18} />
                        Información de la Tabla
                      </h4>
                      <div className="space-y-2">
                        <p className="text-sm">
                          <span className="font-medium text-gray-600">Código:</span> {searchResult.table.code}
                        </p>
                        <p className="text-sm">
                          <span className="font-medium text-gray-600">Archivo:</span> {searchResult.table.fileName}
                        </p>
                        {searchResult.table.fileUrl ? (
                          <p className="text-sm flex items-center">
                            <CheckCircle className="mr-2 text-green-400" size={14} />
                            <span className="font-medium text-gray-600">Link:</span> 
                            <span className="text-green-600 ml-1">Disponible</span>
                          </p>
                        ) : (
                          <p className="text-sm flex items-center">
                            <AlertCircle className="mr-2 text-red-400" size={14} />
                            <span className="font-medium text-gray-600">Link:</span> 
                            <span className="text-red-600 ml-1">No disponible</span>
                          </p>
                        )}
                        <p className="text-sm flex items-center">
                          <Clock className="mr-2 text-gray-400" size={14} />
                          <span className="font-medium text-gray-600">Creada:</span> {formatDate(searchResult.table.createdAt)}
                        </p>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-600">Estado:</span>
                          <span className="flex items-center text-green-600 text-sm">
                            <CheckCircle className="mr-1" size={14} />
                            Entregada
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Botón de reenvío */}
                {searchResult.user.hasTable && searchResult.table?.fileUrl ? (
                  <div className="border-t pt-4">
                    <button
                      onClick={handleResend}
                      disabled={resendLoading}
                      className="w-full md:w-auto flex items-center justify-center px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium"
                    >
                      {resendLoading ? (
                        <>
                          <RefreshCw className="mr-2 animate-spin" size={16} />
                          Reenviando...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2" size={16} />
                          Reenviar Tabla por WhatsApp
                        </>
                      )}
                    </button>
                  </div>
                ) : searchResult.user.hasTable && !searchResult.table?.fileUrl ? (
                  <div className="border-t pt-4">
                    <div className="w-full md:w-auto flex items-center justify-center px-8 py-3 bg-gray-400 text-white rounded-lg cursor-not-allowed font-medium">
                      <AlertCircle className="mr-2" size={16} />
                      NO HAY LINK DE TABLA
                    </div>
                  </div>
                ) : null}

                {/* Mensajes de estado */}
                {searchResult.user.hasTable && !searchResult.table?.fileUrl && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
                    <AlertCircle className="text-red-500 mr-3" size={20} />
                    <p className="text-red-700">
                      <strong>NO HAY LINK DE TABLA:</strong> La tabla existe pero no tiene un enlace válido para envío.
                    </p>
                  </div>
                )}

                {searchResult.user.hasTable && !searchResult.table && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center">
                    <AlertCircle className="text-orange-500 mr-3" size={20} />
                    <p className="text-orange-700">
                      El usuario tiene tabla asignada pero no se pudo cargar la información detallada.
                    </p>
                  </div>
                )}

                {!searchResult.user.hasTable && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
                    <XCircle className="text-red-500 mr-3" size={20} />
                    <p className="text-red-700">
                      Este usuario no tiene una tabla asignada. No es posible reenviar.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <XCircle className="mx-auto text-gray-400 mb-3" size={48} />
                <p className="text-gray-600">No se encontró ningún usuario con el identificador proporcionado.</p>
              </div>
            )}
          </div>
        )}

        {/* Actividad reciente */}
        {recentActivity.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 mt-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <Clock className="mr-2" size={18} />
              Actividad Reciente
            </h3>
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {activity.type === 'search' ? (
                      <Search className="text-blue-500" size={16} />
                    ) : (
                      <Send className="text-green-500" size={16} />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {activity.type === 'search' ? 'Búsqueda' : 'Reenvío'} - {activity.userName || activity.identifier}
                      </p>
                      <p className="text-xs text-gray-500">
                        {activity.identifierType === 'cedula' ? 'Cédula' : 'Teléfono'}: {activity.identifier}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {activity.status === 'success' ? (
                      <CheckCircle className="text-green-500" size={16} />
                    ) : activity.status === 'not_found' ? (
                      <XCircle className="text-orange-500" size={16} />
                    ) : (
                      <AlertCircle className="text-red-500" size={16} />
                    )}
                    <span className="text-xs text-gray-500">
                      {formatDate(activity.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReenvioTablas;
