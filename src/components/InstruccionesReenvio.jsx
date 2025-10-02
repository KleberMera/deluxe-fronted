import React, { useState } from 'react';
import { HelpCircle, X, Code, CheckCircle, AlertCircle, Users, Phone, CreditCard } from 'lucide-react';

const InstruccionesReenvio = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <HelpCircle className="mr-3 text-blue-500" size={24} />
              Instrucciones del Sistema de Reenvío
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Cómo usar el sistema */}
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
              <Users className="mr-2" size={20} />
              Cómo Usar el Sistema
            </h3>
            <div className="space-y-3 text-blue-700">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-blue-800 font-bold text-sm">1</div>
                <p>Selecciona el tipo de búsqueda: <strong>Cédula</strong> o <strong>Teléfono</strong></p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-blue-800 font-bold text-sm">2</div>
                <p>Ingresa el número de cédula o teléfono del usuario</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-blue-800 font-bold text-sm">3</div>
                <p>Haz clic en <strong>"Buscar Usuario"</strong> para verificar si existe</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-blue-800 font-bold text-sm">4</div>
                <p>Si el usuario tiene tabla entregada, aparecerá el botón <strong>"Reenviar Tabla"</strong></p>
              </div>
            </div>
          </div>

          {/* Formatos de entrada */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-green-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-800 mb-3 flex items-center">
                <CreditCard className="mr-2" size={20} />
                Formato de Cédula
              </h3>
              <div className="space-y-2 text-green-700">
                <p><strong>Formato:</strong> 10 dígitos</p>
                <p><strong>Ejemplo:</strong> 1234567890</p>
                <p><strong>Sin guiones o espacios</strong></p>
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-purple-800 mb-3 flex items-center">
                <Phone className="mr-2" size={20} />
                Formato de Teléfono
              </h3>
              <div className="space-y-2 text-purple-700">
                <p><strong>Formato:</strong> Código país + número</p>
                <p><strong>Ejemplo:</strong> 593987654321</p>
                <p><strong>Ecuador:</strong> 593 + 9 dígitos</p>
              </div>
            </div>
          </div>

          {/* Estados del sistema */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Estados del Sistema</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <CheckCircle className="text-green-500" size={20} />
                <div>
                  <p className="font-medium text-green-700">WhatsApp Conectado</p>
                  <p className="text-sm text-green-600">El sistema está listo para reenviar tablas</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <AlertCircle className="text-yellow-500" size={20} />
                <div>
                  <p className="font-medium text-yellow-700">Conectando</p>
                  <p className="text-sm text-yellow-600">WhatsApp se está conectando, espera un momento</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <AlertCircle className="text-red-500" size={20} />
                <div>
                  <p className="font-medium text-red-700">Desconectado</p>
                  <p className="text-sm text-red-600">No se pueden reenviar tablas hasta que se conecte</p>
                </div>
              </div>
            </div>
          </div>

          {/* Validaciones */}
          <div className="bg-orange-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-orange-800 mb-3">Validaciones del Sistema</h3>
            <div className="space-y-2 text-orange-700">
              <p>• El usuario debe estar registrado en la base de datos</p>
              <p>• El usuario debe tener el teléfono verificado</p>
              <p>• El usuario debe tener una tabla asignada</p>
              <p>• La tabla debe estar marcada como entregada</p>
              <p>• El servicio WhatsApp debe estar conectado</p>
            </div>
          </div>

          {/* Códigos de ejemplo para pruebas */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
              <Code className="mr-2" size={20} />
              Ejemplos de Prueba
            </h3>
            <div className="space-y-3">
              <div className="bg-gray-700 rounded p-3">
                <p className="text-gray-300 text-sm mb-1">Buscar por cédula:</p>
                <p className="text-green-400 font-mono">1234567890</p>
              </div>
              <div className="bg-gray-700 rounded p-3">
                <p className="text-gray-300 text-sm mb-1">Buscar por teléfono:</p>
                <p className="text-green-400 font-mono">593987654321</p>
              </div>
            </div>
          </div>

          {/* Solución de problemas */}
          <div className="bg-red-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-red-800 mb-3">Solución de Problemas</h3>
            <div className="space-y-2 text-red-700">
              <p><strong>Usuario no encontrado:</strong> Verifica que el número sea correcto y que el usuario esté registrado</p>
              <p><strong>Tabla no entregada:</strong> La tabla debe estar marcada como entregada en el sistema</p>
              <p><strong>WhatsApp desconectado:</strong> Contacta al administrador para reconectar el servicio</p>
              <p><strong>Error de conexión:</strong> Verifica tu conexión a internet e intenta nuevamente</p>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 font-medium"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstruccionesReenvio;
