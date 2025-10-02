import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';
import MapSelector from '../components/MapSelector';
import environments from '../environment/environments';

const API_URL = process.env.REACT_APP_API_URL || environments.apiUrl;

const RegisterPage = () => {
  const [loading, setLoading] = useState(false);
  const [provincias, setProvincias] = useState([]);
  const [cantones, setCantones] = useState([]);
  const [barrios, setBarrios] = useState([]);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [tempSelectedLocation, setTempSelectedLocation] = useState(null);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState('');
  const [phoneForOtp, setPhoneForOtp] = useState('');
  const [otpResendTime, setOtpResendTime] = useState(0);
  const [currentStep, setCurrentStep] = useState(1);

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
    longitud: Yup.number().required('Seleccione su ubicación en el mapa')
  });

  useEffect(() => {
    setMapReady(true);
    
    return () => {
      if (otpResendTime > 0) {
        clearInterval(otpResendTime);
      }
    };
  }, []);

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
      longitud: null
    },
    validationSchema,
    onSubmit: async (values) => {
      setLoading(true);
      try {
        const checkResponse = await axios.post(`${API_URL}/users/check-user-exists`, {
          phone: values.phone,
          idCard: values.idCard
        });

        if (checkResponse.data.exists) {
          toast.error('Este número de teléfono o cédula ya está registrado');
          return;
        }

        setPhoneForOtp(values.phone);
        await sendOtp(values.phone, values.idCard);
        setShowOtpModal(true);
      } catch (error) {
        const errorMessage = error.response?.data?.error || 'Error al verificar. Por favor, intente de nuevo.';
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    }
  });

  const sendOtp = async (phone, idCard) => {
    try {
      const response = await axios.post(`${API_URL}/users/send-otp`, { phone, idCard });
      toast.success('Código de verificación enviado a tu WhatsApp');
      
      let seconds = 60;
      setOtpResendTime(seconds);
      const timer = setInterval(() => {
        seconds -= 1;
        setOtpResendTime(seconds);
        if (seconds <= 0) {
          clearInterval(timer);
        }
      }, 1000);
      
      return response.data;
    } catch (error) {
      if (error.response?.data?.error?.includes('no está registrado en WhatsApp')) {
        toast.error('El número no está registrado en WhatsApp');
      } else {
        toast.error('Error al enviar código de verificación');
      }
      throw error;
    }
  };

  const verifyOtpAndRegister = async () => {
    if (!otp || otp.length !== 6) {
      toast.error('Por favor ingrese un código de 6 dígitos');
      return;
    }

    setLoading(true);
    try {
      const registerData = {
        ...formik.values,
        userEnteredOTP: otp
      };

      const response = await axios.post(`${API_URL}/users/register`, registerData, {
        headers: { 
          'Content-Type': 'application/json'
        }
      });

      toast.success('¡Registro completado con éxito!');
      setShowOtpModal(false);
      setTimeout(() => {
        formik.resetForm();
        setSelectedLocation(null);
        setOtp('');
        setCurrentStep(1);
      }, 2000);
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Error al registrar. Por favor, intente de nuevo.';
      toast.error(errorMessage);
      
      if (errorMessage.includes('Código de verificación incorrecto')) {
        setOtp('');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchProvincias = async () => {
      try {
        const response = await axios.get(`${API_URL}/locationNew/provincias`);
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
          const response = await axios.get(`${API_URL}/locationNew/provincias/${formik.values.provinciaId}/cantones`);
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
  }, [formik.values.provinciaId]);

  useEffect(() => {
    const fetchBarrios = async () => {
      if (formik.values.cantonId) {
        try {
          const response = await axios.get(`${API_URL}/locationNew/cantones/${formik.values.cantonId}/barrios`);
          setBarrios(response.data.data);
          formik.setFieldValue('barrioId', '');
        } catch (error) {
          toast.error('Error al cargar barrios');
          setBarrios([]);
        }
      }
    };
    fetchBarrios();
  }, [formik.values.cantonId]);

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
      if (!formik.values.provinciaId || !formik.values.cantonId || !formik.values.barrioId || !formik.values.ubicacionDetallada) {
        isValid = false;
      }
      if (formik.errors.ubicacionDetallada) {
        isValid = false;
      }
    } else if (currentStep === 3) {
      if (!selectedLocation) {
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
                currentStep >= step ? 'bg-[#fd0066] text-white' : 'bg-gray-200 text-gray-600'
              } font-semibold text-sm md:text-base`}
            >
              {step}
            </div>
            {step < 3 && (
              <div className={`w-10 md:w-16 h-1 flex items-center ${currentStep > step ? 'bg-[#fd0066]' : 'bg-gray-200'}`}></div>
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
            <h2 className="text-lg font-semibold text-[#fd0066] mb-3 md:mb-4">Información Personal</h2>            
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label htmlFor="firstName" className="block text-gray-700 font-medium mb-1">Nombres</label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  className={`w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent ${
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
                  className={`w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent ${
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
                <label htmlFor="idCard" className="block text-gray-700 font-medium mb-1">Cédula</label>
                <input
                  id="idCard"
                  name="idCard"
                  type="text"
                  className={`w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent ${
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
                {formik.touched.idCard && formik.errors.idCard && (
                  <div className="text-red-500 text-xs mt-1">{formik.errors.idCard}</div>
                )}
              </div>
              
              <div>
                <label htmlFor="phone" className="block text-gray-700 font-medium mb-1">Contacto de Whatsapp</label>
                <input
                  id="phone"
                  name="phone"
                  type="text"
                  className={`w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent ${
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
                className="bg-[#ffde00] hover:bg-[#ffde00] text-black font-bold py-2 px-4 rounded-lg shadow transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#ffde00] focus:ring-opacity-50 flex items-center text-sm"
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
            <h2 className="text-lg font-semibold text-[#fd0066] mb-3 md:mb-4">Ubicación Geográfica</h2>
            
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label htmlFor="provinciaId" className="block text-gray-700 font-medium mb-1">Provincia</label>
                <select
                  id="provinciaId"
                  name="provinciaId"
                  className={`w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent ${
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
                  className={`w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent ${
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
                  className={`w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent ${
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
                  } hover:bg-blue-500/20 focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm`}
                  onClick={() => setMapModalOpen(true)}
                >
                  {selectedLocation ? 
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
                  className={`w-full px-2 py-1 text-sm border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent ${
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
                className="bg-[#ffde00] hover:bg-[#ffde00] text-black font-bold py-2 px-4 rounded-lg shadow transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#ffde00] focus:ring-opacity-50 flex items-center text-sm"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                </svg>
                Anterior
              </button>
              <button
                type="button"
                onClick={nextStep}
                className="bg-[#ffde00] hover:bg-[#ffde00] text-black font-bold py-2 px-4 rounded-lg shadow transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#ffde00] focus:ring-opacity-50 flex items-center text-sm"
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
            <h2 className="text-lg font-semibold text-[#fd0066] mb-3 md:mb-4">Resumen de Registro</h2>
            
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-700 mb-2">Información Personal</h3>
              <div className="grid grid-cols-1 gap-3 mb-3">
                <div>
                  <p className="text-xs text-gray-500">Nombres</p>
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
              </div>
              
              <h3 className="font-semibold text-gray-700 mb-2">Ubicación</h3>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <p className="text-xs text-gray-500">Ubicación Detallada</p>
                  <p className="font-medium text-sm">{formik.values.ubicacionDetallada}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Coordenadas</p>
                  <p className="font-medium text-sm">
                    {selectedLocation ? 
                      `${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)}` : 
                      'No seleccionado'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={prevStep}
                className="bg-[#ffde00] hover:bg-[#ffde00] text-black font-bold py-2 px-4 rounded-lg shadow transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#ffde00] focus:ring-opacity-50 flex items-center text-sm"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                </svg>
                Anterior
              </button>
              <button
                type="submit"
                className="bg-[#ffde00] hover:bg-[#ffde00] text-black font-bold py-2 px-4 rounded-lg shadow transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#ffde00] focus:ring-opacity-50 flex items-center text-sm"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                    Registrar
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
      className="min-h-screen flex items-center justify-center p-2 md:p-4 relative overflow-hidden bg-cover bg-center"
      style={{ backgroundImage: "url('/assets/img/fondo_app.jpg')" }}
    >
      <div className="absolute inset-0 bg-black bg-opacity-10"></div>
      
      <ToastContainer position="top-center" autoClose={5000} />
      
      <div className="w-full max-w-md mx-2 relative z-10">
        {/* Logo más pequeño y centrado */}
        <div className="flex justify-center mb-4">
          <img 
            src="/assets/img/pelicano_letras_blanca.png" 
            alt="Pelican TV" 
            className="h-10 md:h-14 object-contain"
          />
        </div>
        
        {/* Formulario */}
        <div className="bg-white bg-opacity-90 rounded-xl shadow-2xl overflow-hidden border-2 md:border-4 border-white">
          {/* Header con título y fuente personalizada */}
          <div className="bg-[#fd0066] p-2 md:p-3 text-center">
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
            <a 
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
            </a>
            
            {/* TikTok */}
            <a 
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
            </a>
            
            {/* Instagram */}
            <a 
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
            </a>
            
            {/* X (Twitter) */}
            <a 
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
            </a>
          </div>
        
          <img 
            src="/assets/img/@pelicanotvcanalnegro.png" 
            alt="Pelican TV Canal" 
            className="h-5 md:h-7 object-contain"
          />
        </div>
      </div>

      {/* Modal de verificación OTP */}
      {showOtpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
          <div className="bg-white rounded-xl w-full max-w-sm mx-2 p-4 shadow-2xl border-2 md:border-4 border-[#fd0066] relative">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-base md:text-lg font-semibold text-[#fd0066]">Verificación por WhatsApp</h3>
              <button 
                onClick={() => {
                  setShowOtpModal(false);
                  setOtp('');
                }}
                className="text-gray-500 hover:text-[#fd0066] text-xl transition-colors"
              >
                &times;
              </button>
            </div>
            
            <div className="mb-3">
              <p className="text-gray-600 text-xs md:text-sm mb-2">
                Hemos enviado un código de 6 dígitos al número <span className="font-semibold text-[#009cff]">{phoneForOtp}</span>.
                Por favor ingréselo a continuación:
              </p>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Código de verificación"
                className="w-full px-3 py-2 border-2 border-[#009cff] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ffde00] text-center text-sm md:text-base font-mono tracking-widest"
                autoFocus
              />
            </div>
            
            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  if (otpResendTime <= 0) {
                    sendOtp(phoneForOtp);
                  }
                }}
                disabled={otpResendTime > 0}
                className={`text-[#009cff] hover:text-[#fd0066] font-medium transition-colors ${
                  otpResendTime > 0 ? 'text-gray-400 cursor-not-allowed' : ''
                } text-xs`}
              >
                {otpResendTime > 0 ? `Reenviar en ${otpResendTime}s` : 'Reenviar código'}
              </button>
              
              <button
                type="button"
                onClick={verifyOtpAndRegister}
                disabled={loading || otp.length !== 6}
                className={`bg-[#ffde00] hover:bg-[#ffde00] text-black font-bold py-2 px-3 rounded-lg shadow transform hover:scale-105 transition-all duration-300 ${
                  loading || otp.length !== 6 ? 'opacity-50 cursor-not-allowed' : ''
                } text-sm`}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Verificando...
                  </span>
                ) : 'Verificar y Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de mapa */}
      {mapModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-2">
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl w-full max-w-4xl mx-2 h-[80vh] flex flex-col overflow-hidden shadow-2xl border-2 md:border-4 border-[#fd0066] relative">
            {/* Encabezado con efecto de gradiente */}
            <div className="flex justify-between items-center p-3 bg-gradient-to-r from-[#fd0066] to-[#ff2d87]">
              <h3 className="text-base md:text-lg font-bold text-white" style={styles.glitchFont}>
                📍 SELECCIONE SU UBICACIÓN
              </h3>
              <button 
                onClick={() => {
                  setMapModalOpen(false);
                  setTempSelectedLocation(null);
                }}
                className="text-white hover:text-[#ffde00] text-xl leading-none transition-colors duration-300 transform hover:rotate-90"
              >
                &times;
              </button>
            </div>
            
            {/* Contenedor del mapa con efecto de borde */}
            <div className="flex-1 p-1 md:p-2 relative">
              <div className="absolute inset-1 md:inset-2 rounded-lg overflow-hidden border border-[#ffde00] shadow-inner">
                {mapReady ? (
                  <MapSelector 
                    onLocationSelect={(lat, lng) => {
                      setTempSelectedLocation({ lat, lng });
                    }}
                    initialLocation={selectedLocation}
                    tempLocation={tempSelectedLocation}
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#fd0066] mx-auto mb-2"></div>
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
                <div className="text-xs md:text-sm font-medium text-[#fd0066]">
                  <span className="hidden md:inline">📍 Ubicación seleccionada:</span> 
                  <span className="font-mono bg-[#ffde00]/20 px-1 py-0.5 rounded">
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
                  className={`px-3 py-1 bg-[#fd0066] hover:bg-[#ff2d87] text-white font-bold rounded-lg shadow transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#fd0066] focus:ring-opacity-50 flex items-center text-xs md:text-sm ${
                    !tempSelectedLocation ? 'opacity-50 cursor-not-allowed hover:bg-[#fd0066]' : ''
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

export default RegisterPage;