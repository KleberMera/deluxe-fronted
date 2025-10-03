import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';
import MapSelectorVarios from './MapSelectorVarios';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import environments from '../environments/environment';

const MySwal = withReactContent(Swal);
const API_URL = process.env.REACT_APP_API_URL || environments.apiUrl;

const ManualRegistroVarios = () => {
  const [loading, setLoading] = useState(false);
  const [consulting, setConsulting] = useState(false);
  const [provincias, setProvincias] = useState([]);
  const [cantones, setCantones] = useState([]);
  const [barrios, setBarrios] = useState([]);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [tempSelectedLocation, setTempSelectedLocation] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [registradores, setRegistradores] = useState([]);
  const [brigadaInfo, setBrigadaInfo] = useState(null);

  // Helper para normalizar la respuesta de la API /usuarios-otros/check
  const parseApiCheckResponse = (resp) => {
    const top = resp?.data || {};
    // Caso 1: respuesta plana con keys { data: { ...usuario }, message, status }
    // Caso 2: respuesta con data que contiene { success, message, data: null, exists, brigadaInfo }
    // Queremos derivar: exists (boolean), data (obj|null), message (string), brigadaInfo (obj|null)
    let exists = typeof top.exists !== 'undefined' ? top.exists : undefined;
    let data = top.data;
    let message = top.message || '';
    let brigadaInfoResp = top.brigadaInfo || null;

    if (typeof exists === 'undefined' && data && typeof data === 'object') {
      const inner = data;
      if (typeof inner.exists !== 'undefined') {
        exists = inner.exists;
        data = inner.data || null;
        message = inner.message || message;
        brigadaInfoResp = inner.brigadaInfo || brigadaInfoResp;
      } else if (inner && (inner.id || inner.first_name || inner.id_card)) {
        // data ya es el objeto usuario
        exists = true;
        // data stays as is
      } else if (inner && inner.success && typeof inner.exists !== 'undefined') {
        exists = inner.exists;
        data = inner.data || null;
        message = inner.message || message;
        brigadaInfoResp = inner.brigadaInfo || brigadaInfoResp;
      }
    }

    if (typeof exists === 'undefined') exists = false;

    return { exists, data, message, brigadaInfo: brigadaInfoResp };
  };

  // Definir la fuente personalizada
  const styles = {
    glitchFont: {
      fontFamily: "'Doctor Glitch', sans-serif",
      textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)'
    }
  };

  // Cargar la fuente personalizada
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @font-face {
        font-family: 'Doctor Glitch';
        src: url('/assets/fonts/doctor_glitch.woff2') format('woff2');
        font-weight: normal;
        font-style: normal;
      }
    `;
    document.head.appendChild(style);
  }, []);

  // Esquema de validación
  const validationSchema = Yup.object({
    firstName: Yup.string().required('Nombre es obligatorio'),
    lastName: Yup.string().required('Apellido es obligatorio'),
    idCard: Yup.string()
      .matches(/^\d{10}$/, 'La cédula debe tener 10 dígitos')
      .required('Cédula es obligatoria'),
    phone: Yup.string()
      .matches(/^0\d{9}$/, 'El teléfono debe tener 10 dígitos y empezar con 0')
      .required('Teléfono es obligatorio'),
    provinciaId: Yup.string().required('Seleccione una provincia'),
    cantonId: Yup.string().required('Seleccione un cantón'),
    barrioId: Yup.string().required('Seleccione un barrio'),
    ubicacionDetallada: Yup.string()
      .min(10, 'La ubicación detallada debe tener al menos 10 caracteres')
      .max(255, 'La ubicación detallada no puede exceder 255 caracteres')
      .required('La ubicación detallada es obligatoria'),
    latitud: Yup.number().required('Seleccione su ubicación en el mapa'),
    longitud: Yup.number().required('Seleccione su ubicación en el mapa'),
    id_registrador: Yup.string().required('Seleccione un registrador')
  });

  useEffect(() => {
    setMapReady(true);
  }, []);

  useEffect(() => {
    const fetchRegistradores = async () => {
      try {
        const response = await axios.get(`${API_URL}/registrador/activos-con-tipo`);
        if (response.data.success) {
          setRegistradores(response.data.data);
          setBrigadaInfo(response.data.brigadaInfo);
        }
      } catch (error) {
        console.error('Error al cargar registradores:', error);
        toast.error('Error al cargar la lista de registradores');
      }
    };
    fetchRegistradores();
  }, []);

  const checkUserExists = async () => {
    if (!formik.values.idCard || formik.errors.idCard) {
      toast.error('Por favor ingrese una cédula válida antes de consultar');
      return;
    }

    setConsulting(true);
    try {
      const response = await axios.get(`${API_URL}/usuarios-otros/check/${formik.values.idCard}`);

      const { exists, data, message } = parseApiCheckResponse(response);

      if (exists) {
        MySwal.fire({
          title: 'Usuario ya registrado',
          html: (
            <div className="text-left">
              <p className="mb-2 font-semibold text-orange-600">{message}</p>
              <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                <div>
                  <p className="text-gray-500 font-semibold">Nombres:</p>
                  <p>{data?.first_name} {data?.last_name}</p>
                </div>
                <div>
                  <p className="text-gray-500 font-semibold">Cédula:</p>
                  <p>{data?.id_card}</p>
                </div>
              </div>
            </div>
          ),
          icon: 'warning',
          confirmButtonColor: '#f59e0b',
          confirmButtonText: 'Entendido'
        }).then(() => {
          // Limpiar formulario
          formik.resetForm();
          setSelectedLocation(null);
          setCurrentStep(1);
        });
      } else {
        MySwal.fire({
          title: 'Usuario no registrado',
          text: message || 'No se encontró registro para esta cédula. Puede proceder con el registro.',
          icon: 'success',
          confirmButtonColor: '#2563eb',
          confirmButtonText: 'Continuar'
        });
      }
    } catch (error) {
      console.error('Error al consultar usuario:', error);
      toast.error('Error al consultar usuario. Por favor intente nuevamente.');
    } finally {
      setConsulting(false);
    }
  };

  const formik = useFormik({
    initialValues: {
      firstName: '',
      lastName: '',
      idCard: '',
      phone: '',
      provinciaId: '',
      cantonId: '',
      barrioId: '',
      ubicacionDetallada: '',
      latitud: null,
      longitud: null,
      id_registrador: ''
    },
    validationSchema,
    onSubmit: async (values) => {
      setLoading(true);
      try {
        // Verificar si el usuario ya existe (doble verificación)
        const checkResponse = await axios.get(`${API_URL}/usuarios-otros/check/${values.idCard}`);
        const { exists: existsOnCheck } = parseApiCheckResponse(checkResponse);

        if (existsOnCheck) {
          toast.error('Este usuario ya está registrado en el sistema');
          setLoading(false);
          return;
        }

        // Preparar datos para el registro
        const registrationData = {
          first_name: values.firstName,
          last_name: values.lastName,
          id_card: values.idCard,
          phone: values.phone,
          provincia_id: parseInt(values.provinciaId),
          canton_id: parseInt(values.cantonId),
          barrio_id: parseInt(values.barrioId),
          latitud: values.latitud,
          longitud: values.longitud,
          ubicacion_detallada: values.ubicacionDetallada,
          id_registrador: parseInt(values.id_registrador),
          id_evento: brigadaInfo?.id_evento || null
        };

        // Registrar al usuario
        await axios.post(`${API_URL}/usuarios-otros/register`, registrationData);

        MySwal.fire({
          title: '¡Registro exitoso!',
          text: 'El usuario ha sido registrado correctamente.',
          icon: 'success',
          confirmButtonColor: '#2563eb',
          confirmButtonText: 'Aceptar'
        });

        formik.resetForm();
        setSelectedLocation(null);
        setCurrentStep(1);
      } catch (error) {
        console.error('Error en el registro:', error);
        const errorMessage = error.response?.data?.message || 'Error al registrar. Por favor, intente de nuevo.';
        MySwal.fire({
          title: 'Error',
          text: errorMessage,
          icon: 'error',
          confirmButtonColor: '#2563eb'
        });
      } finally {
        setLoading(false);
      }
    }
  });

  useEffect(() => {
    const fetchProvincias = async () => {
      try {
        const response = await axios.get(`${API_URL}/location/provincias`);
        setProvincias(response.data.data);
      } catch (error) {
        toast.error('Error al cargar provincias');
        setProvincias([]);
      }
    };
    fetchProvincias();
  }, []);

  useEffect(() => {
    const fetchCantones = async () => {
      if (formik.values.provinciaId) {
        try {
          const response = await axios.get(`${API_URL}/location/provincias/${formik.values.provinciaId}/cantones`);
          setCantones(response.data.data);
          formik.setFieldValue('cantonId', '');
          formik.setFieldValue('barrioId', '');
          setBarrios([]);
        } catch (error) {
          toast.error('Error al cargar cantones');
          setCantones([]);
        }
      }
    };
    fetchCantones();
  }, [formik.values.provinciaId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const fetchBarrios = async () => {
      if (formik.values.cantonId) {
        try {
          const response = await axios.get(`${API_URL}/location/cantones/${formik.values.cantonId}/barrios`);
          setBarrios(response.data.data);
          formik.setFieldValue('barrioId', '');
        } catch (error) {
          toast.error('Error al cargar barrios');
          setBarrios([]);
        }
      }
    };
    fetchBarrios();
  }, [formik.values.cantonId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLocationSelect = (lat, lng) => {
    setSelectedLocation({ lat, lng });
    formik.setFieldValue('latitud', lat);
    formik.setFieldValue('longitud', lng);
    setMapModalOpen(false);
  };

  const nextStep = () => {
    let isValid = true;
    
    if (currentStep === 1) {
      if (!formik.values.firstName || !formik.values.lastName || !formik.values.idCard || !formik.values.phone) {
        isValid = false;
      }
      if (formik.errors.firstName || formik.errors.lastName || formik.errors.idCard || formik.errors.phone) {
        isValid = false;
      }
    } else if (currentStep === 2) {
      if (!formik.values.provinciaId || !formik.values.cantonId || !formik.values.barrioId || !formik.values.ubicacionDetallada || !selectedLocation) {
        isValid = false;
      }
      if (formik.errors.ubicacionDetallada) {
        isValid = false;
      }
    } else if (currentStep === 3) {
      if (!selectedLocation || !formik.values.id_registrador) {
        isValid = false;
      }
      if (formik.errors.id_registrador) {
        isValid = false;
      }
    }
    
    if (isValid) {
      setCurrentStep(currentStep + 1);
    } else {
      toast.error('Por favor complete todos los campos correctamente antes de continuar');
    }
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const renderStepIndicator = () => {
    return (
      <div className="flex justify-center mb-4 md:mb-6">
        {[1, 2, 3].map((step) => (
          <React.Fragment key={step}>
            <div
              className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center ${
                currentStep >= step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              } font-semibold text-sm md:text-base`}
            >
              {step}
            </div>
            {step < 3 && (
              <div className={`w-10 md:w-16 h-1 flex items-center ${currentStep > step ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-3 md:space-y-4">
            <h2 className="text-lg font-semibold text-blue-600 mb-3 md:mb-4">Información Personal</h2>            
            <div className="grid grid-cols-1 gap-3">

                            <div className="relative">
                <label htmlFor="idCard" className="block text-gray-700 font-medium mb-1">Cédula</label>
                <div className="flex gap-2">
                  <input
                    id="idCard"
                    name="idCard"
                    type="text"
                    className={`w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent ${
                      formik.touched.idCard && formik.errors.idCard ? 'border-red-500' : 'border-gray-300'
                    } transition-all duration-200`}
                    placeholder="Cédula (10 dígitos)"
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                      formik.setFieldValue('idCard', value);
                    }}
                    onBlur={formik.handleBlur}
                    value={formik.values.idCard}
                    inputMode="numeric"
                  />
                  <button
                    type="button"
                    onClick={checkUserExists}
                    disabled={consulting || !formik.values.idCard || formik.errors.idCard}
                    className={`bg-blue-600 text-white font-bold py-2 px-3 rounded-lg shadow transition-all duration-300 ${
                      consulting || !formik.values.idCard || formik.errors.idCard ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700 hover:scale-105'
                    } flex items-center justify-center whitespace-nowrap`}
                  >
                    {consulting ? (
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      'Consultar'
                    )}
                  </button>
                </div>
                {formik.touched.idCard && formik.errors.idCard && (
                  <div className="text-red-500 text-xs mt-1">{formik.errors.idCard}</div>
                )}
              </div>
              
              <div>
                <label htmlFor="firstName" className="block text-gray-700 font-medium mb-1">Nombres</label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  className={`w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent ${
                    formik.touched.firstName && formik.errors.firstName ? 'border-red-500' : 'border-gray-300'
                  } transition-all duration-200`}
                  placeholder="Nombre"
                  onChange={(e) => {
                    const upperValue = e.target.value.toUpperCase();
                    formik.setFieldValue('firstName', upperValue);
                  }}
                  onBlur={formik.handleBlur}
                  value={formik.values.firstName}
                />
                {formik.touched.firstName && formik.errors.firstName && (
                  <div className="text-red-500 text-xs mt-1">{formik.errors.firstName}</div>
                )}
              </div>
              
              <div>
                <label htmlFor="lastName" className="block text-gray-700 font-medium mb-1">Apellidos</label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  className={`w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent ${
                    formik.touched.lastName && formik.errors.lastName ? 'border-red-500' : 'border-gray-300'
                  } transition-all duration-200`}
                  placeholder="Apellido"
                  onChange={(e) => {
                    const upperValue = e.target.value.toUpperCase();
                    formik.setFieldValue('lastName', upperValue);
                  }}
                  onBlur={formik.handleBlur}
                  value={formik.values.lastName}
                />
                {formik.touched.lastName && formik.errors.lastName && (
                  <div className="text-red-500 text-xs mt-1">{formik.errors.lastName}</div>
                )}
              </div>
              

              
              <div>
                <label htmlFor="phone" className="block text-gray-700 font-medium mb-1">Contacto de Whatsapp</label>
                <input
                  id="phone"
                  name="phone"
                  type="text"
                  className={`w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent ${
                    formik.touched.phone && formik.errors.phone ? 'border-red-500' : 'border-gray-300'
                  } transition-all duration-200`}
                  placeholder="Teléfono (10 dígitos, empieza con 0)"
                  onChange={(e) => {
                    let value = e.target.value.replace(/\D/g, '');
                    if (value.length > 0 && value[0] !== '0') {
                      value = '0' + value;
                    }
                    value = value.slice(0, 10);
                    formik.setFieldValue('phone', value);
                  }}
                  onBlur={formik.handleBlur}
                  value={formik.values.phone}
                  inputMode="tel"
                />
                {formik.touched.phone && formik.errors.phone && (
                  <div className="text-red-500 text-xs mt-1">{formik.errors.phone}</div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={nextStep}
                className="bg-zinc-600 hover:bg-zinc-700 text-white font-bold py-2 px-4 rounded-lg shadow transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-opacity-50 flex items-center text-sm"
              >
                Siguiente
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-3 md:space-y-4">
            <h2 className="text-lg font-semibold text-blue-600 mb-3 md:mb-4">Ubicación Geográfica</h2>
            
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label htmlFor="provinciaId" className="block text-gray-700 font-medium mb-1">Provincia</label>
                <select
                  id="provinciaId"
                  name="provinciaId"
                  className={`w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent ${
                    formik.touched.provinciaId && formik.errors.provinciaId ? 'border-red-500' : 'border-gray-300'
                  } transition-all duration-200`}
                  onChange={formik.handleChange}
                  value={formik.values.provinciaId}
                >
                  <option value="">Seleccione una provincia</option>
                  {provincias.map(provincia => (
                    <option key={provincia.id} value={provincia.id}>{provincia.nombre}</option>
                  ))}
                </select>
                {formik.touched.provinciaId && formik.errors.provinciaId && (
                  <div className="text-red-500 text-xs mt-1">{formik.errors.provinciaId}</div>
                )}
              </div>
              <div>
                <label htmlFor="cantonId" className="block text-gray-700 font-medium mb-1">Cantón</label>
                <select
                  id="cantonId"
                  name="cantonId"
                  className={`w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent ${
                    formik.touched.cantonId && formik.errors.cantonId ? 'border-red-500' : 'border-gray-300'
                  } transition-all duration-200 ${!formik.values.provinciaId ? 'bg-gray-100' : ''}`}
                  onChange={formik.handleChange}
                  value={formik.values.cantonId}
                  disabled={!formik.values.provinciaId}
                >
                  <option value="">Seleccione un cantón</option>
                  {cantones.map(canton => (
                    <option key={canton.id} value={canton.id}>{canton.nombre}</option>
                  ))}
                </select>
                {formik.touched.cantonId && formik.errors.cantonId && (
                  <div className="text-red-500 text-xs mt-1">{formik.errors.cantonId}</div>
                )}
              </div>
              <div>
                <label htmlFor="barrioId" className="block text-gray-700 font-medium mb-1">Barrio</label>
                <select
                  id="barrioId"
                  name="barrioId"
                  className={`w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent ${
                    formik.touched.barrioId && formik.errors.barrioId ? 'border-red-500' : 'border-gray-300'
                  } transition-all duration-200 ${!formik.values.cantonId ? 'bg-gray-100' : ''}`}
                  onChange={formik.handleChange}
                  value={formik.values.barrioId}
                  disabled={!formik.values.cantonId}
                >
                  <option value="">Seleccione un barrio</option>
                  {barrios.map(barrio => (
                    <option key={barrio.id} value={barrio.id}>{barrio.nombre}</option>
                  ))}
                </select>
                {formik.touched.barrioId && formik.errors.barrioId && (
                  <div className="text-red-500 text-xs mt-1">{formik.errors.barrioId}</div>
                )}
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-1">Ubicación en Mapa</label>
                <button
                  type="button"
                  className={`w-full px-3 py-2 border-2 rounded-lg text-left transition-all duration-200 ${
                    formik.touched.latitud && formik.errors.latitud ? 'border-red-500' : 'border-blue-500'
                  } ${
                    selectedLocation ? 'text-gray-800 bg-blue-500/10' : 'text-gray-500 bg-white'
                  } hover:bg-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm`}
                  onClick={() => setMapModalOpen(true)}
                >
                  {selectedLocation && typeof selectedLocation.lat === 'number' && typeof selectedLocation.lng === 'number' ?
                    `📍 Ubicación seleccionada: ${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)}` :
                    '📍 Seleccionar ubicación en el mapa'}
                </button>
                {(formik.touched.latitud && formik.errors.latitud) && (
                  <div className="text-red-500 text-xs mt-1">Debe seleccionar una ubicación en el mapa</div>
                )}
              </div>
              <div>
                <label htmlFor="ubicacionDetallada" className="block text-gray-700 font-medium mb-1">
                  Ubicación Detallada
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <textarea
                  id="ubicacionDetallada"
                  name="ubicacionDetallada"
                  rows="2"
                  className={`w-full px-2 py-1 text-sm border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent ${
                    formik.touched.ubicacionDetallada && formik.errors.ubicacionDetallada ? 'border-red-500' : 'border-gray-300'
                  } transition-all duration-200 resize-none`}
                  placeholder="Describe tu ubicación exacta: referencias, nombre de la calle, número de casa, edificio, etc. (mínimo 10 caracteres)"
                  onChange={(e) => {
                    const upperValue = e.target.value.toUpperCase();
                    formik.setFieldValue('ubicacionDetallada', upperValue);
                  }}                  
                  onBlur={formik.handleBlur}
                  value={formik.values.ubicacionDetallada}
                  maxLength={255}
                />
                {formik.touched.ubicacionDetallada && formik.errors.ubicacionDetallada && (
                  <div className="text-red-500 text-xs mt-1">{formik.errors.ubicacionDetallada}</div>
                )}
                <div className="text-xs text-gray-500 mt-1">
                  {formik.values.ubicacionDetallada.length}/255 caracteres
                </div>
              </div>
            </div>
            
            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={prevStep}
                className="bg-zinc-600 hover:bg-zinc-700 text-white font-bold py-2 px-4 rounded-lg shadow transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-opacity-50 flex items-center text-sm"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                </svg>
                Anterior
              </button>
              <button
                type="button"
                onClick={nextStep}
                className="bg-zinc-600 hover:bg-zinc-700 text-white font-bold py-2 px-4 rounded-lg shadow transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-opacity-50 flex items-center text-sm"
              >
                Siguiente
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-3 md:space-y-4">
            <h2 className="text-lg font-semibold text-blue-600 mb-3 md:mb-4">Finalizar Registro</h2>
            
            {/* Selector de registrador */}
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label htmlFor="id_registrador" className="block text-gray-700 font-medium mb-1">
                  Registrador <span className="text-red-500">*</span>
                </label>
                <select
                  id="id_registrador"
                  name="id_registrador"
                  className={`w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent ${
                    formik.touched.id_registrador && formik.errors.id_registrador ? 'border-red-500' : 'border-gray-300'
                  } transition-all duration-200`}
                  onChange={formik.handleChange}
                  value={formik.values.id_registrador}
                >
                  <option value="">Seleccione un registrador</option>
                  {registradores.map(registrador => (
                    <option key={registrador.id} value={registrador.id}>
                      {registrador.nombre_registrador}
                    </option>
                  ))}
                </select>
                {formik.touched.id_registrador && formik.errors.id_registrador && (
                  <div className="text-red-500 text-xs mt-1">{formik.errors.id_registrador}</div>
                )}
              </div>

              {/* Tipo de registrador (solo lectura) */}
              {formik.values.id_registrador && (
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Tipo de Registrador</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg bg-gray-100 text-gray-700"
                    value={
                      registradores.find(r => String(r.id) === String(formik.values.id_registrador))?.nombre_tipo || ''
                    }
                    readOnly
                    disabled
                  />
                </div>
              )}
            </div>

            {/* Resumen del registro */}
            <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200">
              <h3 className="font-semibold text-gray-700 mb-2">Resumen de Registro</h3>
              <div className="grid grid-cols-1 gap-3 mb-3">
                <div>
                  <p className="text-xs text-gray-500">Nombres Completos</p>
                  <p className="font-medium text-sm">{formik.values.firstName} {formik.values.lastName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Cédula</p>
                  <p className="font-medium text-sm">{formik.values.idCard}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Teléfono</p>
                  <p className="font-medium text-sm">{formik.values.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Ubicación Detallada</p>
                  <p className="font-medium text-sm">{formik.values.ubicacionDetallada}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Coordenadas</p>
                  <p className="font-medium text-sm">
                    {selectedLocation && typeof selectedLocation.lat === 'number' && typeof selectedLocation.lng === 'number'
                      ? `${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)}`
                      : 'No seleccionado'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={prevStep}
                className="bg-zinc-600 hover:bg-zinc-700 text-white font-bold py-2 px-4 rounded-lg shadow transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-opacity-50 flex items-center text-sm"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                </svg>
                Anterior
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 flex items-center text-sm"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Procesando...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013 3v1"></path>
                    </svg>
                    Registrar Usuario
                  </span>
                )}
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-2 md:p-4 relative overflow-hidden bg-gradient-to-br from-blue-900 via-blue-800 to-zinc-900"
    >
      <div className="absolute inset-0 bg-black bg-opacity-20"></div>
      
      <ToastContainer position="top-center" autoClose={5000} />
      
      <div className="w-full max-w-md mx-2 relative z-10">
        {/* Logo más pequeño y centrado */}
        <div className="flex justify-center mb-4">
          {/* <img 
            src="/assets/img/pelicano_letras_blanca.png" 
            alt="Pelican TV" 
            className="h-10 md:h-14 object-contain"
          /> */}
        </div>
        
        {/* Formulario */}
        <div className="bg-white bg-opacity-90 rounded-xl shadow-2xl overflow-hidden border-2 md:border-4 border-white">
          {/* Header con título y fuente personalizada */}
          <div className="bg-blue-600 p-2 md:p-3 text-center">
            <h1 
              className="text-xl md:text-2xl font-bold text-white"
              style={{ fontFamily: "'Doctor Glitch', sans-serif", textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)' }}
            >
              REGISTRO DE USUARIOS
            </h1>
          </div>
          
          <div className="p-3 md:p-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
            {renderStepIndicator()}
            <form onSubmit={formik.handleSubmit}>
              {renderStepContent()}
            </form>
          </div>
        </div>
        
        {/* Redes sociales y canal */}
        <div className="flex flex-col items-center mt-3 space-y-2">
          <div className="flex space-x-3">
            {/* Facebook */}
            {/* <a 
              href="https://facebook.com/pelicanotvcanal" 
              target="_blank" 
              rel="noopener noreferrer"
              className="transition-transform duration-300 hover:scale-110"
            >
              <img 
                src="/assets/img/facebook.png" 
                alt="Facebook Pelicano TV" 
                className="h-7 md:h-9 object-contain"
              />
            </a> */}
            
            {/* TikTok */}
            {/* <a 
              href="https://tiktok.com/@pelicanotvcanal" 
              target="_blank" 
              rel="noopener noreferrer"
              className="transition-transform duration-300 hover:scale-110"
            >
              <img 
                src="/assets/img/tiktok.png" 
                alt="TikTok Pelicano TV" 
                className="h-7 md:h-9 object-contain"
              />
            </a> */}
            
            {/* Instagram */}
            {/* <a 
              href="https://instagram.com/pelicanotvcanal" 
              target="_blank" 
              rel="noopener noreferrer"
              className="transition-transform duration-300 hover:scale-110"
            >
              <img 
                src="/assets/img/instagram.png" 
                alt="Instagram Pelicano TV" 
                className="h-7 md:h-9 object-contain"
              />
            </a> */}
            
            {/* X (Twitter) */}
            {/* <a 
              href="https://x.com/pelicanotvcanal"
              target="_blank" 
              rel="noopener noreferrer"
              className="transition-transform duration-300 hover:scale-110"
            >
              <img 
                src="/assets/img/x.png" 
                alt="X Pelicano TV" 
                className="h-7 md:h-9 object-contain"
              />
            </a> */}
          </div>
        
          {/* <img 
            src="/assets/img/@pelicanotvcanalnegro.png" 
            alt="Pelican TV Canal" 
            className="h-5 md:h-7 object-contain"
          /> */}
        </div>
      </div>

      {/* Modal de mapa */}
      {mapModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-2">
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl w-full max-w-4xl mx-2 h-[80vh] flex flex-col overflow-hidden shadow-2xl border-2 md:border-4 border-blue-600 relative">
            {/* Encabezado con efecto de gradiente */}
            <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-600 to-blue-700">
              <h3 className="text-base md:text-lg font-bold text-white" style={styles.glitchFont}>
                📍 SELECCIONE SU UBICACIÓN
              </h3>
              <button 
                onClick={() => {
                  setMapModalOpen(false);
                  setTempSelectedLocation(null);
                }}
                className="text-white hover:text-zinc-300 text-xl leading-none transition-colors duration-300 transform hover:rotate-90"
              >
                &times;
              </button>
            </div>
            
            {/* Contenedor del mapa con efecto de borde */}
            <div className="flex-1 p-1 md:p-2 relative">
              <div className="absolute inset-1 md:inset-2 rounded-lg overflow-hidden border border-zinc-400 shadow-inner">
                {mapReady ? (
                  <MapSelectorVarios 
                    onLocationSelect={(lat, lng) => {
                      setTempSelectedLocation({ lat, lng });
                    }}
                    initialLocation={selectedLocation}
                    tempLocation={tempSelectedLocation}
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <span className="text-gray-700 text-xs md:text-sm font-medium">
                        Cargando mapa interactivo...
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Pie de página con botones */}
            <div className="p-2 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200 flex justify-between items-center">
              {tempSelectedLocation && (
                <div className="text-xs md:text-sm font-medium text-blue-600">
                  <span className="hidden md:inline">📍 Ubicación seleccionada:</span> 
                  <span className="font-mono bg-zinc-200 px-1 py-0.5 rounded">
                    {tempSelectedLocation.lat.toFixed(6)}, {tempSelectedLocation.lng.toFixed(6)}
                  </span>
                </div>
              )}
              
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setMapModalOpen(false);
                    setTempSelectedLocation(null);
                  }}
                  className="px-3 py-1 bg-gray-400 hover:bg-gray-500 text-white font-bold rounded-lg shadow transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 flex items-center text-xs md:text-sm"
                >
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (tempSelectedLocation) {
                      handleLocationSelect(tempSelectedLocation.lat, tempSelectedLocation.lng);
                    }
                    setMapModalOpen(false);
                    setTempSelectedLocation(null);
                  }}
                  disabled={!tempSelectedLocation}
                  className={`px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 flex items-center text-xs md:text-sm ${
                    !tempSelectedLocation ? 'opacity-50 cursor-not-allowed hover:bg-blue-600' : ''
                  }`}
                >
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManualRegistroVarios;
