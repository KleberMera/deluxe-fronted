import React, { useState, useEffect } from 'react';
import { 
  Users, Send, Filter, Eye, Play, Square, BarChart3, 
  MessageCircle, AlertCircle, CheckCircle,
  RefreshCw, Clock, X, Plus, Trash2, Activity,
  Image, Upload, FileImage, FileText, Download
} from 'lucide-react';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';

const MensajeriaMasiva = () => {
  const [activeTab, setActiveTab] = useState('create'); // 'create', 'campaigns', 'stats'
  const [provinces, setProvinces] = useState([]);
  const [cantons, setCantons] = useState([]);

  // Funciones helper para mostrar mensajes con Swal
  const showSuccess = (message) => {
    Swal.fire({
      icon: 'success',
      title: '¡Éxito!',
      text: message,
      timer: 3000,
      timerProgressBar: true,
      showConfirmButton: false,
      toast: true,
      position: 'top-end'
    });
  };

  const showError = (message) => {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: message,
      confirmButtonColor: '#ef4444'
    });
  };

  // Función para manejar selección de imagen
  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    setImageError(null);

    if (!file) {
      setSelectedImage(null);
      setImagePreview(null);
      return;
    }

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      setImageError('Solo se permiten archivos de imagen (JPG, PNG, GIF, etc.)');
      setSelectedImage(null);
      setImagePreview(null);
      event.target.value = '';
      return;
    }

    // Validar tamaño (5MB máximo)
    const maxSize = 10 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setImageError('La imagen no puede superar los 5MB de tamaño');
      setSelectedImage(null);
      setImagePreview(null);
      event.target.value = '';
      return;
    }

    setSelectedImage(file);

    // Crear vista previa
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Función para remover imagen seleccionada
  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setImageError(null);
    // Limpiar el input file
    const fileInput = document.getElementById('campaign-image');
    if (fileInput) fileInput.value = '';
  };
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Estados para filtros
  const [filters, setFilters] = useState({
    provinciaId: '',
    cantonId: '',
    barrioIds: [],
    registrationDateFrom: '',
    registrationDateTo: ''
  });

  // Estados para campaña
  const [campaignData, setCampaignData] = useState({
    name: '',
    message: '',
    intervalMinutes: 1,
    maxMessagesPerHour: 60
  });

  // Estados para imagen de campaña
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageError, setImageError] = useState(null);

  const [preview, setPreview] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showMessagePreview, setShowMessagePreview] = useState(false); // Vista previa del mensaje
  const [excludedUsers, setExcludedUsers] = useState([]); // IDs de usuarios excluidos

  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 50;

  // Estados para modal de detalles de campaña
  const [showCampaignDetails, setShowCampaignDetails] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [campaignDetails, setCampaignDetails] = useState(null);

  // Configuración de URL - cambiar para desarrollo/producción
  const BASE_URL =  'https://restdeluxe.bingoamigo.net';


  const AUTH_TOKEN = 'admin-token-123';

  const headers = {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json'
  };

  // Cargar provincias al montar el componente
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadProvinces();
    loadCampaigns();
  }, []);

  const loadProvinces = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/bulk-messaging/filters/provinces`);
      const result = await response.json();
      if (result.success) {
        setProvinces(result.data);
      }
    } catch (err) {
      console.error('Error loading provinces:', err);
    }
  };

  const loadCantons = async (provinceId) => {
    if (!provinceId) {
      setCantons([]);
      setNeighborhoods([]);
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/api/bulk-messaging/filters/provinces/${provinceId}/cantones`);
      const result = await response.json();
      if (result.success) {
        setCantons(result.data);
        setNeighborhoods([]);
      }
    } catch (err) {
      console.error('Error loading cantons:', err);
    }
  };

  const loadNeighborhoods = async (cantonId) => {
    if (!cantonId) {
      setNeighborhoods([]);
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/api/bulk-messaging/filters/cantones/${cantonId}/barrios`);
      const result = await response.json();
      if (result.success) {
        setNeighborhoods(result.data);
      }
    } catch (err) {
      console.error('Error loading neighborhoods:', err);
    }
  };

  const loadCampaigns = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/bulk-messaging/campaigns`, { headers });
      const result = await response.json();
      if (result.success) {
        setCampaigns(result.data.campaigns || []);
      }
    } catch (err) {
      console.error('Error loading campaigns:', err);
    }
  };

  const handleProvinceChange = async (provinceId) => {
    setFilters({ ...filters, provinciaId: provinceId, cantonId: '', barrioIds: [] });
    await loadCantons(provinceId);
    
    // Si se selecciona una provincia, también intentamos cargar todos sus barrios
    if (provinceId) {
      try {
        const response = await fetch(`${BASE_URL}/api/bulk-messaging/filters/provinces/${provinceId}/all-barrios`);
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            // Mostrar todos los barrios de la provincia si la API lo soporta
            setNeighborhoods(result.data);
          }
        }
      } catch (err) {
        // Si no existe la ruta, no hacer nada - se mantendrá la funcionalidad original
        console.log('All-barrios endpoint not available, using canton-based selection');
      }
    } else {
      setNeighborhoods([]);
    }
  };

  const handleCantonChange = (cantonId) => {
    setFilters({ ...filters, cantonId: cantonId, barrioIds: [] });
    loadNeighborhoods(cantonId);
  };

  const handleNeighborhoodToggle = (barrioId) => {
    const currentBarrios = filters.barrioIds;
    const newBarrios = currentBarrios.includes(barrioId)
      ? currentBarrios.filter(id => id !== barrioId)
      : [...currentBarrios, barrioId];
    
    setFilters({ ...filters, barrioIds: newBarrios });
  };

  const previewUsers = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${BASE_URL}/api/bulk-messaging/users/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: {
            provinciaId: filters.provinciaId || undefined,
            cantonId: filters.cantonId || undefined,
            barrioIds: filters.barrioIds.length > 0 ? filters.barrioIds : undefined,
            registrationDateFrom: filters.registrationDateFrom || undefined,
            registrationDateTo: filters.registrationDateTo || undefined
          },
          limit: 5000 // Cargar hasta 5000 usuarios para manejar bases de datos grandes
        })
      });

      const result = await response.json();
      if (result.success) {
        setPreview(result.data);
        setExcludedUsers([]); // Limpiar exclusiones previas
        setCurrentPage(1); // Resetear a primera página
        setShowPreview(true);
      } else {
        showError(result.message || 'Error al previsualizar usuarios');
      }
    } catch (err) {
      showError('Error de conexión al previsualizar usuarios');
      console.error('Preview error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Función para excluir/incluir un usuario
  const toggleUserExclusion = (userId) => {
    setExcludedUsers(prev => {
      // Asegurarse de que prev sea un array
      const currentExcluded = Array.isArray(prev) ? prev : [];
      if (currentExcluded.includes(userId)) {
        return currentExcluded.filter(id => id !== userId);
      } else {
        return [...currentExcluded, userId];
      }
    });
  };

  // Función para obtener usuarios activos (no excluidos)
  const getActiveUsers = () => {
    if (!preview) return [];
    // Asegurarse de que excludedUsers sea un array
    const currentExcluded = Array.isArray(excludedUsers) ? excludedUsers : [];
    return preview.users.filter(user => !currentExcluded.includes(user.id));
  };

  // Función para obtener usuarios de la página actual (todos, no solo activos)
  const getCurrentPageUsers = () => {
    if (!preview) return [];
    const startIndex = (currentPage - 1) * usersPerPage;
    const endIndex = startIndex + usersPerPage;
    return preview.users.slice(startIndex, endIndex);
  };

  // Función para obtener el total de páginas (basado en todos los usuarios)
  const getTotalPages = () => {
    if (!preview) return 1;
    return Math.ceil(preview.users.length / usersPerPage);
  };

  // Función para obtener detalles de campaña específica
  const getCampaignDetails = async (campaignId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/bulk-messaging/campaigns/${campaignId}/details`, {
        method: 'GET',
        headers
      });

      const result = await response.json();
      if (result.success) {
        setCampaignDetails(result.data);
        setSelectedCampaign(campaigns.find(c => c.id === campaignId));
        setShowCampaignDetails(true);
      } else {
        showError(result.message || 'Error al obtener detalles de campaña');
      }
    } catch (err) {
      showError('Error de conexión al obtener detalles de campaña');
      console.error('Get campaign details error:', err);
    }
  };

  // Función para exportar detalles de campaña a Excel con formato de tabla
  const exportCampaignToExcel = (campaign, details) => {
    try {
      // Crear un nuevo libro de Excel
      const wb = XLSX.utils.book_new();

      // Hoja 1: Información General
      const infoData = [
        ['INFORMACIÓN DE CAMPAÑA'],
        [''],
        ['Campo', 'Valor'],
        ['ID', campaign.id],
        ['Nombre', campaign.name],
        ['Estado', campaign.status === 'completed' ? 'Completada' :
                  campaign.status === 'running' ? 'En Progreso' :
                  campaign.status === 'pending' ? 'Pendiente' :
                  campaign.status === 'paused' ? 'Pausada' : 'Cancelada'],
        ['Fecha Creación', new Date(campaign.created_at).toLocaleString('es-ES')],
        ['Fecha Inicio', campaign.started_at ? new Date(campaign.started_at).toLocaleString('es-ES') : 'N/A'],
        ['Fecha Finalización', campaign.completed_at ? new Date(campaign.completed_at).toLocaleString('es-ES') : 'N/A'],
        ['Total Usuarios', campaign.total_users],
        ['Mensajes Enviados', details?.stats?.sent || 0],
        ['Mensajes con Error', details?.stats?.error || 0],
        ['Mensajes Pendientes', details?.stats?.pending || 0],
        ['Mensajes Cancelados', details?.stats?.cancelled || 0],
        ['Intervalo (minutos)', campaign.interval_minutes],
        ['Máximo por hora', campaign.max_messages_per_hour],
        [''],
        ['MENSAJE ENVIADO'],
        [campaign.message]
      ];

      const infoWS = XLSX.utils.aoa_to_sheet(infoData);
      
      // Aplicar formato a la hoja de información
      infoWS['!cols'] = [
        { width: 20 }, // Columna A
        { width: 40 }  // Columna B
      ];

      // Estilos para los encabezados
      const infoRange = XLSX.utils.decode_range(infoWS['!ref']);
      for (let row = infoRange.s.r; row <= infoRange.e.r; row++) {
        for (let col = infoRange.s.c; col <= infoRange.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          if (!infoWS[cellAddress]) continue;
          
          if (row === 0 || row === 13) { // Títulos principales
            infoWS[cellAddress].s = {
              font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
              fill: { fgColor: { rgb: "4F46E5" } },
              alignment: { horizontal: "center" }
            };
          } else if (row === 2) { // Encabezado de tabla
            infoWS[cellAddress].s = {
              font: { bold: true },
              fill: { fgColor: { rgb: "E5E7EB" } }
            };
          }
        }
      }

      XLSX.utils.book_append_sheet(wb, infoWS, 'Información');

      // Hoja 2: Mensajes Exitosos
      let successData = [
        ['MENSAJES ENVIADOS EXITOSAMENTE'],
        [''],
        ['Nombre', 'Apellido', 'Teléfono', 'Barrio', 'Cantón', 'Provincia', 'Tabla', 'Fecha Envío']
      ];

      if (details?.logs && details.logs.filter(log => log.status === 'sent').length > 0) {
        details.logs
          .filter(log => log.status === 'sent')
          .forEach(log => {
            successData.push([
              log.first_name || 'N/A',
              log.last_name || 'N/A',
              log.phone || 'N/A',
              log.barrio || 'N/A',
              log.canton || 'N/A',
              log.provincia || 'N/A',
              log.table_code || 'Sin tabla',
              log.sent_at ? new Date(log.sent_at).toLocaleString('es-ES') : 'N/A'
            ]);
          });
      } else {
        successData.push(['No hay mensajes enviados exitosamente', '', '', '', '', '', '', '']);
      }

      const successWS = XLSX.utils.aoa_to_sheet(successData);
      
      // Aplicar formato a la hoja de mensajes exitosos
      successWS['!cols'] = [
        { width: 15 }, // Nombre
        { width: 15 }, // Apellido
        { width: 15 }, // Teléfono
        { width: 20 }, // Barrio
        { width: 20 }, // Cantón
        { width: 20 }, // Provincia
        { width: 15 }, // Tabla
        { width: 20 }  // Fecha
      ];

      // Estilos para la tabla de mensajes exitosos
      const successRange = XLSX.utils.decode_range(successWS['!ref']);
      for (let row = successRange.s.r; row <= successRange.e.r; row++) {
        for (let col = successRange.s.c; col <= successRange.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          if (!successWS[cellAddress]) continue;
          
          if (row === 0) { // Título principal
            successWS[cellAddress].s = {
              font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
              fill: { fgColor: { rgb: "059669" } },
              alignment: { horizontal: "center" }
            };
          } else if (row === 2) { // Encabezado de tabla
            successWS[cellAddress].s = {
              font: { bold: true },
              fill: { fgColor: { rgb: "D1FAE5" } }
            };
          } else if (row > 2) { // Datos de la tabla
            successWS[cellAddress].s = {
              alignment: { vertical: "center" }
            };
          }
        }
      }

      // Crear tabla en Excel para los datos exitosos
      if (successData.length > 3) {
        successWS['!table'] = {
          ref: `A3:H${successData.length}`,
          headerRow: true,
          totalsRow: false
        };
      }

      XLSX.utils.book_append_sheet(wb, successWS, 'Mensajes Exitosos');

      // Hoja 3: Mensajes Fallidos
      let failedData = [
        ['NÚMEROS FALLIDOS'],
        [''],
        ['Nombre', 'Apellido', 'Teléfono', 'Estado', 'Error', 'Barrio', 'Cantón', 'Provincia', 'Tabla', 'Fecha Intento']
      ];

      // Combinar failed_numbers con logs que no sean 'sent'
      const allFailedLogs = [];

      // Agregar failed_numbers si existen
      if (details?.failed_numbers && details.failed_numbers.length > 0) {
        details.failed_numbers.forEach(failed => {
          allFailedLogs.push({
            first_name: failed.first_name,
            last_name: failed.last_name,
            phone: failed.phone,
            status: failed.status,
            error_message: failed.error_message,
            barrio: failed.barrio,
            canton: failed.canton,
            provincia: failed.provincia,
            table_code: failed.table_code,
            sent_at: failed.sent_at
          });
        });
      }

      // Agregar logs con status diferente a 'sent' (error, failed, etc.)
      if (details?.logs && details.logs.length > 0) {
        details.logs
          .filter(log => log.status !== 'sent')
          .forEach(log => {
            // Evitar duplicados si ya están en failed_numbers
            const exists = allFailedLogs.some(f => f.phone === log.phone);
            if (!exists) {
              allFailedLogs.push({
                first_name: log.first_name,
                last_name: log.last_name,
                phone: log.phone,
                status: log.status,
                error_message: log.error_message || 'Error en envío',
                barrio: log.barrio,
                canton: log.canton,
                provincia: log.provincia,
                table_code: log.table_code,
                sent_at: log.sent_at
              });
            }
          });
      }

      if (allFailedLogs.length > 0) {
        allFailedLogs.forEach(failed => {
          failedData.push([
            failed.first_name || 'N/A',
            failed.last_name || 'N/A',
            failed.phone || 'N/A',
            failed.status || 'N/A',
            failed.error_message || 'N/A',
            failed.barrio || 'N/A',
            failed.canton || 'N/A',
            failed.provincia || 'N/A',
            failed.table_code || 'Sin tabla',
            failed.sent_at ? new Date(failed.sent_at).toLocaleString('es-ES') : 'N/A'
          ]);
        });
      } else {
        failedData.push(['No hay números fallidos en esta campaña', '', '', '', '', '', '', '', '', '']);
      }

      const failedWS = XLSX.utils.aoa_to_sheet(failedData);
      
      // Aplicar formato a la hoja de mensajes fallidos
      failedWS['!cols'] = [
        { width: 15 }, // Nombre
        { width: 15 }, // Apellido
        { width: 15 }, // Teléfono
        { width: 12 }, // Estado
        { width: 30 }, // Error
        { width: 20 }, // Barrio
        { width: 20 }, // Cantón
        { width: 20 }, // Provincia
        { width: 15 }, // Tabla
        { width: 20 }  // Fecha
      ];

      // Estilos para la tabla de mensajes fallidos
      const failedRange = XLSX.utils.decode_range(failedWS['!ref']);
      for (let row = failedRange.s.r; row <= failedRange.e.r; row++) {
        for (let col = failedRange.s.c; col <= failedRange.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          if (!failedWS[cellAddress]) continue;
          
          if (row === 0) { // Título principal
            failedWS[cellAddress].s = {
              font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
              fill: { fgColor: { rgb: "DC2626" } },
              alignment: { horizontal: "center" }
            };
          } else if (row === 2) { // Encabezado de tabla
            failedWS[cellAddress].s = {
              font: { bold: true },
              fill: { fgColor: { rgb: "FEE2E2" } }
            };
          } else if (row > 2) { // Datos de la tabla
            failedWS[cellAddress].s = {
              alignment: { vertical: "center" }
            };
          }
        }
      }

      // Crear tabla en Excel para los datos fallidos
      if (allFailedLogs.length > 0) {
        failedWS['!table'] = {
          ref: `A3:J${failedData.length}`,
          headerRow: true,
          totalsRow: false
        };
      }

      XLSX.utils.book_append_sheet(wb, failedWS, 'Mensajes Fallidos');

      // Generar y descargar el archivo
      const fileName = `campaña_${campaign.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      showSuccess('Archivo Excel exportado exitosamente con formato de tabla');
    } catch (err) {
      showError('Error al exportar datos a Excel');
      console.error('Export to Excel error:', err);
    }
  };

  const createCampaign = async () => {
    if (!campaignData.name.trim()) {
      showError('El nombre de la campaña es obligatorio');
      return;
    }

    if (!campaignData.message.trim()) {
      showError('El mensaje es obligatorio');
      return;
    }

    const activeUsers = getActiveUsers();
    if (!preview || activeUsers.length === 0) {
      showError('Debe tener al menos un usuario seleccionado para crear la campaña');
      return;
    }

    console.log('🔍 DEBUG - Total usuarios en preview:', preview.users.length);
    console.log('🔍 DEBUG - Usuarios excluidos:', excludedUsers.length);
    console.log('🔍 DEBUG - Usuarios activos (no excluidos):', activeUsers.length);
    console.log('🔍 DEBUG - IDs de usuarios activos:', activeUsers.map(user => user.id));

    setLoading(true);
    setError(null);

    try {
      // Crear FormData para enviar imagen si existe
      const formData = new FormData();
      
      // Agregar datos básicos
      formData.append('name', campaignData.name.trim());
      formData.append('message', campaignData.message.trim());
      formData.append('userIds', JSON.stringify(activeUsers.map(user => user.id)));
      formData.append('filters', JSON.stringify({
        provinciaId: filters.provinciaId || undefined,
        cantonId: filters.cantonId || undefined,
        barrioIds: filters.barrioIds.length > 0 ? filters.barrioIds : undefined,
        registrationDateFrom: filters.registrationDateFrom || undefined,
        registrationDateTo: filters.registrationDateTo || undefined
      }));
      formData.append('intervalMinutes', campaignData.intervalMinutes.toString());
      formData.append('maxMessagesPerHour', campaignData.maxMessagesPerHour.toString());
      formData.append('createdBy', 'admin_user');

      // Agregar imagen si fue seleccionada
      if (selectedImage) {
        formData.append('campaignImage', selectedImage);
        console.log('📁 Imagen agregada al FormData:', selectedImage.name, `(${selectedImage.size} bytes)`);
      }

      console.log('🚀 DEBUG - Enviando FormData con imagen:', selectedImage ? 'SÍ' : 'NO');

      const response = await fetch(`${BASE_URL}/api/bulk-messaging/campaigns`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`
          // No incluir Content-Type, dejar que el navegador lo setee automáticamente para FormData
        },
        body: formData
      });

      const result = await response.json();
      if (result.success) {
        showSuccess(`Campaña creada exitosamente. Se enviará a ${activeUsers.length} usuarios.${selectedImage ? ' Con imagen adjunta.' : ''}`);
        setCampaignData({ name: '', message: '', intervalMinutes: 2, maxMessagesPerHour: 30 });
        setFilters({ provinciaId: '', cantonId: '', barrioIds: [], registrationDateFrom: '', registrationDateTo: '' });
        setPreview(null);
        setShowPreview(false);
        setExcludedUsers([]); // Limpiar usuarios excluidos
        // Limpiar imagen
        removeImage();
        loadCampaigns();
        setActiveTab('campaigns');
        
        setTimeout(() => setSuccess(null), 5000);
      } else {
        showError(result.message || 'Error al crear campaña');
      }
    } catch (err) {
      showError('Error de conexión al crear campaña');
      console.error('Create campaign error:', err);
    } finally {
      setLoading(false);
    }
  };

  const startCampaign = async (campaignId) => {
    // Confirmación antes de iniciar la campaña
    const result = await Swal.fire({
      title: '🚀 Iniciar Campaña',
      html: '¿Estás seguro de que deseas iniciar esta campaña?<br><br>' +
            'Una vez iniciada, comenzará a enviar mensajes automáticamente según la configuración.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, iniciar campaña',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    });

    if (!result.isConfirmed) return;

    try {
      const response = await fetch(`${BASE_URL}/api/bulk-messaging/campaigns/${campaignId}/start`, {
        method: 'POST',
        headers
      });

      const result = await response.json();
      if (result.success) {
        showSuccess('Campaña iniciada exitosamente');
        loadCampaigns();
      } else {
        showError(result.message || 'Error al iniciar campaña');
      }
    } catch (err) {
      showError('Error de conexión al iniciar campaña');
      console.error('Start campaign error:', err);
    }
  };

  const cancelCampaign = async (campaignId) => {
    // Confirmación antes de cancelar la campaña
    const result = await Swal.fire({
      title: '❌ Cancelar Campaña',
      html: '¿Estás seguro de que deseas cancelar esta campaña?<br><br>' +
            '⚠️ Esta acción detendrá permanentemente el envío de mensajes y no se podrá reanudar.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, cancelar campaña',
      cancelButtonText: 'No cancelar',
      reverseButtons: true
    });

    if (!result.isConfirmed) return;

    try {
      const response = await fetch(`${BASE_URL}/api/bulk-messaging/campaigns/${campaignId}/cancel`, {
        method: 'POST',
        headers
      });

      const result = await response.json();
      if (result.success) {
        showSuccess('Campaña cancelada exitosamente');
        loadCampaigns();
      } else {
        showError(result.message || 'Error al cancelar campaña');
      }
    } catch (err) {
      showError('Error de conexión al cancelar campaña');
      console.error('Cancel campaign error:', err);
    }
  };

  const pauseCampaign = async (campaignId) => {
    // Confirmación antes de pausar la campaña
    const result = await Swal.fire({
      title: '⏸️ Pausar Campaña',
      html: '¿Estás seguro de que deseas pausar esta campaña?<br><br>' +
            'La campaña se detendrá temporalmente y podrás reanudarla más tarde.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#f59e0b',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, pausar campaña',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    });

    if (!result.isConfirmed) return;

    try {
      const response = await fetch(`${BASE_URL}/api/bulk-messaging/campaigns/${campaignId}/pause`, {
        method: 'POST',
        headers
      });

      const result = await response.json();
      if (result.success) {
        showSuccess('Campaña pausada exitosamente');
        loadCampaigns();
      } else {
        showError(result.message || 'Error al pausar campaña');
      }
    } catch (err) {
      showError('Error de conexión al pausar campaña');
      console.error('Pause campaign error:', err);
    }
  };

  const resumeCampaign = async (campaignId) => {
    // Confirmación antes de reanudar la campaña
    const result = await Swal.fire({
      title: '▶️ Reanudar Campaña',
      html: '¿Estás seguro de que deseas reanudar esta campaña?<br><br>' +
            'La campaña continuará enviando mensajes desde donde se detuvo.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, reanudar campaña',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    });

    if (!result.isConfirmed) return;

    try {
      const response = await fetch(`${BASE_URL}/api/bulk-messaging/campaigns/${campaignId}/resume`, {
        method: 'POST',
        headers
      });

      const result = await response.json();
      if (result.success) {
        showSuccess('Campaña reanudada exitosamente');
        loadCampaigns();
      } else {
        showError(result.message || 'Error al reanudar campaña');
      }
    } catch (err) {
      setError('Error de conexión al reanudar campaña');
      console.error('Resume campaign error:', err);
    }
  };

  const deleteCampaign = async (campaignId, campaignName, campaignStatus) => {
    // Confirmación doble para eliminar campañas
    const statusText = {
      'pending': 'pendiente',
      'running': 'en progreso',
      'paused': 'pausada',
      'completed': 'completada',
      'cancelled': 'cancelada'
    };

    const confirmMessage = `⚠️ ELIMINAR CAMPAÑA\n\n` +
      `¿Estás seguro de eliminar permanentemente la campaña?\n\n` +
      `📋 Nombre: "${campaignName}"\n` +
      `📊 Estado: ${statusText[campaignStatus] || campaignStatus}\n\n` +
      `⚠️ ATENCIÓN: Esta acción NO se puede deshacer.\n` +
      `Se eliminarán todos los registros y estadísticas asociadas.\n\n` +
      `¿Continuar con la eliminación?`;

    const result = await Swal.fire({
      title: '⚠️ Eliminar Campaña',
      html: confirmMessage,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    });

    if (!result.isConfirmed) return;

    // Segunda confirmación para mayor seguridad
    const inputResult = await Swal.fire({
      title: '🚨 Confirmación Final',
      html: `Para confirmar la eliminación, escribe <strong>"ELIMINAR"</strong> en el campo de abajo:`,
      input: 'text',
      inputPlaceholder: 'Escribe ELIMINAR para confirmar',
      inputValidator: (value) => {
        if (!value || value.toUpperCase() !== 'ELIMINAR') {
          return 'Debes escribir "ELIMINAR" para continuar';
        }
      },
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Eliminar Definitivamente',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    });

    if (!inputResult.isConfirmed) return;

    try {
      setLoading(true);
      console.log(`🗑️ Eliminando campaña ${campaignId}: ${campaignName}`);
      console.log(`🌐 URL del endpoint: ${BASE_URL}/api/bulk-messaging/campaigns/${campaignId}`);

      const response = await fetch(`${BASE_URL}/api/bulk-messaging/campaigns/${campaignId}`, {
        method: 'DELETE',
        headers
      });

      const result = await response.json();
      if (result.success) {
        setSuccess(`Campaña "${campaignName}" eliminada exitosamente`);
        loadCampaigns(); // Recargar lista
        setTimeout(() => setSuccess(null), 5000);
      } else {
        setError(result.message || 'Error al eliminar campaña');
      }
    } catch (err) {
      console.error('Delete campaign error:', err);
      if (err.message.includes('Failed to fetch')) {
        setError(`Error de conexión: No se pudo conectar al servidor ${BASE_URL}. ¿Está el servidor ejecutándose?`);
      } else {
        setError(`Error al eliminar campaña: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const deleteCompletedCampaigns = async () => {
    const completedCampaigns = campaigns.filter(c => c.status === 'completed' || c.status === 'cancelled');
    
    if (completedCampaigns.length === 0) {
      setError('No hay campañas completadas o canceladas para eliminar');
      return;
    }

    const confirmMessage = `🗑️ ELIMINAR CAMPAÑAS FINALIZADAS\n\n` +
      `¿Eliminar todas las campañas completadas y canceladas?\n\n` +
      `📊 Total a eliminar: ${completedCampaigns.length} campañas\n` +
      `• Completadas: ${completedCampaigns.filter(c => c.status === 'completed').length}\n` +
      `• Canceladas: ${completedCampaigns.filter(c => c.status === 'cancelled').length}\n\n` +
      `⚠️ Esta acción eliminará permanentemente todas las estadísticas y registros.\n\n` +
      `¿Continuar?`;

    const result = await Swal.fire({
      title: '🗑️ Eliminar Campañas Finalizadas',
      html: confirmMessage,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar todas',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    });

    if (!result.isConfirmed) return;

    try {
      setLoading(true);
      console.log(`🗑️ Eliminando ${completedCampaigns.length} campañas finalizadas`);

      // Eliminar campañas una por una
      let successCount = 0;
      let errorCount = 0;

      for (const campaign of completedCampaigns) {
        try {
          const response = await fetch(`${BASE_URL}/api/bulk-messaging/campaigns/${campaign.id}`, {
            method: 'DELETE',
            headers
          });

          const result = await response.json();
          if (result.success) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (err) {
          errorCount++;
          console.error(`Error eliminando campaña ${campaign.id}:`, err);
        }
      }

      if (successCount > 0) {
        setSuccess(`${successCount} campañas eliminadas exitosamente${errorCount > 0 ? ` (${errorCount} errores)` : ''}`);
        loadCampaigns(); // Recargar lista
      } else {
        setError('No se pudo eliminar ninguna campaña');
      }

      setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);

    } catch (err) {
      setError('Error general al eliminar campañas');
      console.error('Delete completed campaigns error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Componente de filtros
  const FiltersSection = () => (
    <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 mb-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
        <Filter className="mr-2" size={20} />
        Filtros de Audiencia
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Provincia */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Provincia
          </label>
          <select
            value={filters.provinciaId}
            onChange={(e) => handleProvinceChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Todas las provincias</option>
            {provinces.map(province => (
              <option key={province.id} value={province.id}>
                {province.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Cantón */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cantón
          </label>
          <select
            value={filters.cantonId}
            onChange={(e) => handleCantonChange(e.target.value)}
            disabled={!filters.provinciaId}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          >
            <option value="">Todos los cantones</option>
            {cantons.map(canton => (
              <option key={canton.id} value={canton.id}>
                {canton.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Selector de barrios mejorado */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Barrios 
            {filters.barrioIds.length > 0 && (
              <span className="text-blue-600 font-semibold">({filters.barrioIds.length} seleccionados)</span>
            )}
          </label>
          {neighborhoods.length > 0 ? (
            <div className="relative">
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white cursor-pointer"
                onChange={(e) => {
                  if (e.target.value) {
                    handleNeighborhoodToggle(parseInt(e.target.value));
                    e.target.value = ""; // Reset select
                  }
                }}
              >
                <option value="">Seleccionar barrio...</option>
                {neighborhoods
                  .filter(n => !filters.barrioIds.includes(n.id))
                  .map(neighborhood => (
                    <option key={neighborhood.id} value={neighborhood.id}>
                      {neighborhood.nombre}
                    </option>
                  ))
                }
              </select>
              <div className="absolute right-2 top-2 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </div>
            </div>
          ) : (
            <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 text-sm">
              {filters.cantonId ? 'Cargando barrios...' : 'Selecciona un cantón primero'}
            </div>
          )}
        </div>
      </div>

      {/* Barrios seleccionados */}
      {filters.barrioIds.length > 0 && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Barrios Seleccionados ({filters.barrioIds.length})
          </label>
          <div className="flex flex-wrap gap-2">
            {filters.barrioIds.map(barrioId => {
              const barrio = neighborhoods.find(n => n.id === barrioId);
              return barrio ? (
                <span
                  key={barrioId}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                >
                  {barrio.nombre}
                  <button
                    onClick={() => handleNeighborhoodToggle(barrioId)}
                    className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-200 hover:bg-blue-300 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </span>
              ) : null;
            })}
            <button
              onClick={() => setFilters({ ...filters, barrioIds: [] })}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
            >
              Limpiar todos
              <X className="ml-1" size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Acciones rápidas para barrios */}
      {neighborhoods.length > 0 && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => {
              const allBarrioIds = neighborhoods.map(n => n.id);
              setFilters({ ...filters, barrioIds: allBarrioIds });
            }}
            className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors"
          >
            Seleccionar todos
          </button>
          <button
            onClick={() => setFilters({ ...filters, barrioIds: [] })}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Deseleccionar todos
          </button>
          <span className="text-sm text-gray-600 py-1">
            {neighborhoods.length} barrios disponibles
          </span>
        </div>
      )}

      {/* Fechas */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Fecha desde */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Registrado desde
          </label>
          <input
            type="date"
            value={filters.registrationDateFrom}
            onChange={(e) => setFilters({ ...filters, registrationDateFrom: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Fecha hasta */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Registrado hasta
          </label>
          <input
            type="date"
            value={filters.registrationDateTo}
            onChange={(e) => setFilters({ ...filters, registrationDateTo: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Botón de previsualización */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={previewUsers}
          disabled={loading}
          className="flex items-center px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 transition-all duration-300"
        >
          {loading ? (
            <>
              <RefreshCw className="mr-2 animate-spin" size={16} />
              Cargando...
            </>
          ) : (
            <>
              <Eye className="mr-2" size={16} />
              Previsualizar Usuarios
            </>
          )}
        </button>
      </div>
    </div>
  );

  // Componente de previsualización
  const PreviewSection = () => {
    if (!showPreview || !preview) return null;

    const activeUsers = getActiveUsers();
    const totalUsers = preview.users.length;
    const excludedCount = excludedUsers.length;
    const activeCount = activeUsers.length;

    return (
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800 flex items-center">
            <Users className="mr-2" size={20} />
            Previsualización de Usuarios
          </h3>
          <button
            onClick={() => {
              setShowPreview(false);
              setExcludedUsers([]);
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Estadísticas mejoradas */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">{totalUsers}</p>
              <p className="text-sm text-blue-800">Total encontrados</p>
              {totalUsers >= 5000 && (
                <p className="text-xs text-orange-600 mt-1">⚠️ Límite de carga alcanzado</p>
              )}
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{activeCount}</p>
              <p className="text-sm text-green-800">Para enviar</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">
                {(() => {
                  const intervalMinutes = campaignData.intervalMinutes || 2;
                  const maxPerHour = campaignData.maxMessagesPerHour || 30;
                  
                  // Si hay pocos usuarios, el tiempo se basa en el intervalo
                  if (activeCount <= maxPerHour) {
                    const totalMinutes = activeCount * intervalMinutes;
                    if (totalMinutes < 60) {
                      return `${totalMinutes}m`;
                    } else {
                      const hours = Math.floor(totalMinutes / 60);
                      const minutes = totalMinutes % 60;
                      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
                    }
                  } else {
                    // Si hay muchos usuarios, considerar el límite por hora
                    const hours = Math.ceil(activeCount / maxPerHour);
                    return `${hours}h`;
                  }
                })()}
              </p>
              <p className="text-sm text-purple-800">Tiempo estimado</p>
            </div>
          </div>
          
          {excludedCount > 0 && (
            <div className="mt-3 pt-3 border-t border-blue-200">
              <p className="text-sm text-red-600 text-center">
                {excludedCount} usuarios excluidos de la campaña
              </p>
            </div>
          )}
          
          {totalUsers >= 5000 && (
            <div className="mt-3 pt-3 border-t border-blue-200">
              <p className="text-sm text-orange-600 text-center">
                💡 Si necesitas más usuarios, aplica filtros más específicos para reducir la cantidad
              </p>
            </div>
          )}
        </div>

        {/* Controles de selección y paginación */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <button
              onClick={() => {
                setExcludedUsers([]);
                setCurrentPage(1); // Reset to first page when selecting all
              }}
              className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors"
              disabled={excludedCount === 0}
            >
              Seleccionar todos
            </button>
            <button
              onClick={() => {
                setExcludedUsers(preview.users.map(u => u.id));
                setCurrentPage(1); // Reset to first page when excluding all
              }}
              className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors"
              disabled={excludedCount === totalUsers}
            >
              Excluir todos
            </button>
          </div>
          
          {/* Información de paginación */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              Página {currentPage} de {getTotalPages()} • {activeCount} de {totalUsers} usuarios seleccionados
            </span>
            
            {/* Controles de paginación */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-2 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ‹ Anterior
              </button>
              
              <span className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded">
                {currentPage} / {getTotalPages()}
              </span>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(getTotalPages(), prev + 1))}
                disabled={currentPage === getTotalPages()}
                className="px-2 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente ›
              </button>
            </div>
          </div>
        </div>

        {/* Tabla de usuarios */}
        <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left p-3 w-12">
                  <input
                    type="checkbox"
                    checked={excludedCount === 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setExcludedUsers([]);
                        setCurrentPage(1); // Reset to first page when selecting all
                      } else {
                        setExcludedUsers(preview.users.map(u => u.id));
                      }
                    }}
                    className="rounded"
                  />
                </th>
                <th className="text-left p-3">#</th>
                <th className="text-left p-3">Usuario</th>
                <th className="text-left p-3">Teléfono</th>
                <th className="text-left p-3">Ubicación</th>
                <th className="text-left p-3">Tabla</th>
                <th className="text-left p-3 w-20">Acción</th>
              </tr>
            </thead>
            <tbody>
              {getCurrentPageUsers().map((user, index) => {
                const globalIndex = (currentPage - 1) * usersPerPage + index + 1;
                const isExcluded = excludedUsers.includes(user.id);
                
                return (
                  <tr 
                    key={user.id} 
                    className={`border-b border-gray-100 transition-colors ${
                      isExcluded ? 'bg-red-50 opacity-60' : index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                    }`}
                  >
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={!isExcluded}
                        onChange={() => toggleUserExclusion(user.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="p-3 text-gray-500 font-mono text-xs">
                      {globalIndex}
                    </td>
                    <td className="p-3">
                      <div className={isExcluded ? 'line-through text-gray-500' : ''}>
                        {user.first_name} {user.last_name}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className={isExcluded ? 'line-through text-gray-500' : ''}>
                        {user.phone}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className={isExcluded ? 'line-through text-gray-500' : ''}>
                        {user.barrio}, {user.canton}
                      </div>
                    </td>
                    <td className="p-3">
                      {user.table_code ? (
                        <div className="flex items-center">
                          <CheckCircle className="text-green-500 mr-1" size={16} />
                          <div className="text-sm">
                            <div className="text-green-700 font-medium">{user.table_code}</div>
                            {user.tabla_entregado === 1 && (
                              <div className="text-green-600 text-xs">✅ Entregada</div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">Sin tabla</span>
                      )}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => toggleUserExclusion(user.id)}
                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                          isExcluded 
                            ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                      >
                        {isExcluded ? 'Incluir' : 'Excluir'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {preview.users.length === 0 && (
          <div className="text-center py-8">
            <Users className="mx-auto text-gray-400 mb-3" size={48} />
            <p className="text-gray-600">No se encontraron usuarios con los filtros seleccionados.</p>
          </div>
        )}
      </div>
    );
  };

  // Modal de detalles de campaña
  const CampaignDetailsModal = () => {
    if (!showCampaignDetails || !selectedCampaign) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
          {/* Header del modal */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <FileText className="text-purple-500" size={24} />
              <div>
                <h2 className="text-xl font-bold text-gray-800">Logs de Campaña</h2>
                <p className="text-sm text-gray-600">{selectedCampaign.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => exportCampaignToExcel(selectedCampaign, campaignDetails)}
                className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                <Download className="mr-2" size={16} />
                Exportar Excel
              </button>
              <button
                onClick={() => {
                  setShowCampaignDetails(false);
                  setSelectedCampaign(null);
                  setCampaignDetails(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Contenido del modal */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {campaignDetails ? (
              <div className="space-y-6">
                {/* Información general */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <BarChart3 className="mr-2" size={18} />
                    Información General
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-3 rounded border">
                      <p className="text-sm text-gray-600">Estado</p>
                      <p className="font-semibold text-lg">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          selectedCampaign.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          selectedCampaign.status === 'running' ? 'bg-blue-100 text-blue-800' :
                          selectedCampaign.status === 'paused' ? 'bg-orange-100 text-orange-800' :
                          selectedCampaign.status === 'completed' ? 'bg-green-100 text-green-800' :
                          selectedCampaign.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedCampaign.status === 'pending' ? 'Pendiente' :
                           selectedCampaign.status === 'running' ? 'En progreso' :
                           selectedCampaign.status === 'paused' ? 'Pausada' :
                           selectedCampaign.status === 'completed' ? 'Completada' :
                           selectedCampaign.status === 'cancelled' ? 'Cancelada' : selectedCampaign.status}
                        </span>
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <p className="text-sm text-gray-600">Total Usuarios</p>
                      <p className="font-semibold text-lg text-blue-600">{selectedCampaign.total_users}</p>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <p className="text-sm text-gray-600">Mensajes Enviados</p>
                      <p className="font-semibold text-lg text-green-600">{campaignDetails.stats?.sent || 0}</p>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <p className="text-sm text-gray-600">Mensajes con Error</p>
                      <p className="font-semibold text-lg text-red-600">{campaignDetails.stats?.error || 0}</p>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <p className="text-sm text-gray-600">Mensajes Pendientes</p>
                      <p className="font-semibold text-lg text-blue-600">{campaignDetails.stats?.pending || 0}</p>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <p className="text-sm text-gray-600">Mensajes Cancelados</p>
                      <p className="font-semibold text-lg text-orange-600">{campaignDetails.stats?.cancelled || 0}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="bg-white p-3 rounded border">
                      <p className="text-sm text-gray-600">Fecha Creación</p>
                      <p className="font-medium">{new Date(selectedCampaign.created_at).toLocaleString('es-ES')}</p>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <p className="text-sm text-gray-600">Fecha Inicio</p>
                      <p className="font-medium">
                        {selectedCampaign.started_at ? new Date(selectedCampaign.started_at).toLocaleString('es-ES') : 'No iniciado'}
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <p className="text-sm text-gray-600">Fecha Finalización</p>
                      <p className="font-medium">
                        {selectedCampaign.completed_at ? new Date(selectedCampaign.completed_at).toLocaleString('es-ES') : 'No finalizado'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Mensaje enviado */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                    <MessageCircle className="mr-2" size={18} />
                    Mensaje Enviado
                  </h3>
                  <div className="bg-white p-4 rounded border border-blue-200">
                    <p className="text-gray-800 whitespace-pre-wrap">{selectedCampaign.message}</p>
                  </div>
                  <div className="mt-3 flex items-center space-x-4 text-sm text-gray-600">
                    <span>Intervalo: {selectedCampaign.interval_minutes} minutos</span>
                    <span>Máximo por hora: {selectedCampaign.max_messages_per_hour}</span>
                  </div>
                </div>

                {/* Mensajes enviados exitosamente */}
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <CheckCircle className="mr-2 text-green-500" size={18} />
                    Mensajes Enviados Exitosamente ({campaignDetails.logs?.filter(log => log.status === 'sent').length || 0})
                  </h3>
                  
                  {campaignDetails.logs && campaignDetails.logs.filter(log => log.status === 'sent').length > 0 ? (
                    <div className="bg-white border border-green-200 rounded-lg overflow-hidden">
                      <div className="max-h-96 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-green-100 sticky top-0">
                            <tr>
                              <th className="text-left p-3">Usuario</th>
                              <th className="text-left p-3">Teléfono</th>
                              <th className="text-left p-3">Estado</th>
                              <th className="text-left p-3">Ubicación</th>
                              <th className="text-left p-3">Tabla</th>
                              <th className="text-left p-3">Fecha Envío</th>
                            </tr>
                          </thead>
                          <tbody>
                            {campaignDetails.logs
                              .filter(log => log.status === 'sent')
                              .map((log, index) => (
                              <tr key={log.id || index} className="border-b border-green-100">
                                <td className="p-3">
                                  <div className="font-medium text-gray-800 text-sm">
                                    {log.first_name} {log.last_name}
                                  </div>
                                </td>
                                <td className="p-3 font-mono text-sm">{log.phone}</td>
                                <td className="p-3">
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    ✓ Enviado
                                  </span>
                                </td>
                                <td className="p-3 text-sm">
                                  <div className="text-xs">
                                    {log.barrio && log.canton ? 
                                      `${log.barrio}, ${log.canton}` : 
                                      'Sin ubicación'}
                                  </div>
                                </td>
                                <td className="p-3 text-sm">
                                  {log.table_code ? (
                                    <span className="text-green-700 font-medium">{log.table_code}</span>
                                  ) : (
                                    <span className="text-gray-400">Sin tabla</span>
                                  )}
                                </td>
                                <td className="p-3 text-sm text-gray-600">
                                  {log.sent_at ? new Date(log.sent_at).toLocaleString('es-ES') : 'N/A'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white p-6 rounded border border-green-200 text-center">
                      <Clock className="mx-auto text-gray-400 mb-3" size={32} />
                      <h4 className="font-medium text-gray-800 mb-2">Sin mensajes enviados aún</h4>
                      <p className="text-sm text-gray-600">
                        Los mensajes exitosos aparecerán aquí una vez que la campaña comience a enviar.
                      </p>
                    </div>
                  )}
                </div>

                {/* Números fallidos */}
                <div className="bg-amber-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <AlertCircle className="mr-2 text-amber-500" size={18} />
                    Números Fallidos ({campaignDetails.failed_numbers?.length || 0})
                  </h3>
                  
                  {campaignDetails.failed_numbers && campaignDetails.failed_numbers.length > 0 ? (
                    <div className="bg-white border border-amber-200 rounded-lg overflow-hidden">
                      <div className="max-h-96 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-amber-100 sticky top-0">
                            <tr>
                              <th className="text-left p-3">Usuario</th>
                              <th className="text-left p-3">Teléfono</th>
                              <th className="text-left p-3">Estado</th>
                              <th className="text-left p-3">Error</th>
                              <th className="text-left p-3">Ubicación</th>
                              <th className="text-left p-3">Fecha</th>
                            </tr>
                          </thead>
                          <tbody>
                            {campaignDetails.failed_numbers.map((failed, index) => (
                              <tr key={index} className="border-b border-amber-100">
                                <td className="p-3">
                                  <div className="font-medium text-gray-800">
                                    {failed.first_name} {failed.last_name}
                                  </div>
                                  {failed.table_code && (
                                    <div className="text-xs text-gray-500">
                                      Tabla: {failed.table_code}
                                    </div>
                                  )}
                                </td>
                                <td className="p-3 font-mono text-sm">{failed.phone}</td>
                                <td className="p-3">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    failed.status === 'error' ? 'bg-red-100 text-red-800' :
                                    failed.status === 'failed' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {failed.status === 'error' ? 'Error' :
                                     failed.status === 'failed' ? 'Fallido' :
                                     failed.status}
                                  </span>
                                </td>
                                <td className="p-3 text-sm text-red-700 max-w-xs truncate" title={failed.error_message}>
                                  {failed.error_message || 'Sin mensaje de error'}
                                </td>
                                <td className="p-3 text-sm">
                                  {failed.barrio && failed.canton ? 
                                    `${failed.barrio}, ${failed.canton}` : 
                                    'Sin ubicación'}
                                </td>
                                <td className="p-3 text-sm text-gray-600">
                                  {failed.sent_at ? new Date(failed.sent_at).toLocaleString('es-ES') : 'N/A'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white p-6 rounded border border-amber-200 text-center">
                      <CheckCircle className="mx-auto text-green-500 mb-3" size={32} />
                      <h4 className="font-medium text-gray-800 mb-2">¡Excelente resultado!</h4>
                      <p className="text-sm text-gray-600">
                        No hay números fallidos en esta campaña. Todos los mensajes se enviaron correctamente.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <AlertCircle className="mx-auto text-gray-400 mb-3" size={48} />
                <p className="text-gray-600">No se pudieron cargar los detalles de la campaña.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 mb-8 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <MessageCircle className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Mensajería Masiva</h1>
                <p className="text-white/90 text-sm">Envío de mensajes WhatsApp a múltiples usuarios</p>
              </div>
            </div>
          </div>
        </div>


        {/* Tabs */}
        <div className="flex bg-white rounded-lg p-1 mb-6 shadow-sm border border-gray-200">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
              activeTab === 'create'
                ? 'bg-purple-500 text-white shadow-md'
                : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50'
            }`}
          >
            <Plus className="mr-2" size={16} />
            Crear Campaña
          </button>
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
              activeTab === 'campaigns'
                ? 'bg-purple-500 text-white shadow-md'
                : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50'
            }`}
          >
            <Activity className="mr-2" size={16} />
            Campañas
          </button>
        </div>

        {/* Mensajes de error y éxito */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center">
            <AlertCircle className="text-red-500 mr-3" size={20} />
            <p className="text-red-700">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="text-red-500" size={16} />
            </button>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center">
            <CheckCircle className="text-green-500 mr-3" size={20} />
            <p className="text-green-700">{success}</p>
            <button onClick={() => setSuccess(null)} className="ml-auto">
              <X className="text-green-500" size={16} />
            </button>
          </div>
        )}


          {activeTab === 'create' && (
          <>
            <FiltersSection />
            <PreviewSection />

            {/* Formulario de campaña */}
            {showPreview && preview && (
              <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                  <Send className="mr-2" size={20} />
                  Configurar Campaña
                </h3>

                <div className="space-y-4">
                  {/* Nombre de campaña */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre de la Campaña *
                    </label>
                    <input
                      type="text"
                      value={campaignData.name}
                      onChange={(e) => setCampaignData({ ...campaignData, name: e.target.value })}
                      placeholder="Ej: Bingo Amigo Prime / Deluxe"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>

                  {/* Mensaje con variables mejorado */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mensaje * <span className="text-purple-600">con Variables Personalizadas</span>
                    </label>
                    
                    {/* Botones de variables rápidas */}
                    <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-gray-700">📝 Variables Disponibles (click para insertar):</p>
                        <select 
                          onChange={(e) => {
                            if (e.target.value) {
                              setCampaignData({ ...campaignData, message: e.target.value });
                              e.target.value = ''; // Reset select
                            }
                          }}
                          className="text-xs px-2 py-1 border border-purple-200 rounded bg-white text-purple-700"
                          defaultValue=""
                        >
                          <option value="">📋 Plantillas</option>
                          <option value="¡Hola {firstName}! 👋 Tu tabla de bingo {tableCode} está {tablaEntregado}. ¡Buena suerte! 🎯">
                            🎯 Tabla Lista
                          </option>
                          <option value="¡Saludos {firstName}! 🎊 Te invitamos al evento especial de bingo este fin de semana en {canton}. ¡Inscríbete ya! 📞 Confirma al {phone}">
                            🎊 Invitación Evento
                          </option>
                          <option value="Hola {firstName}, desde {barrio} te recordamos que puedes participar en nuestro bingo virtual. Tu teléfono {phone} está registrado. 📱">
                            📱 Recordatorio Virtual
                          </option>
                          <option value="¡Felicidades {fullName}! 🏆 Has sido seleccionado para participar en el sorteo especial en {provincia}. ¡Mucha suerte! 🍀">
                            🏆 Sorteo Especial
                          </option>
                          <option value="Estimado/a {firstName}, tu tabla {tableCode} está {tablaEntregado} en {canton}. ¡Aprovecha ahora! 💰">
                            💰 Promociones
                          </option>
                          <option value="🚨 RECORDATORIO: {firstName}, tu participación está confirmada. Tabla: {tableCode} | Ubicación: {barrio}, {canton}. ¡Te esperamos! ⏰">
                            🚨 Recordatorio Urgente
                          </option>
                        </select>
                        <div className="mt-2 text-xs text-gray-600">
                          💡 <strong>Tip:</strong> Usa emojis para hacer más atractivos tus mensajes: 🎯🏆🎊📱💰🚨⏰👋🍀✨
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { var: '{firstName}', label: '👤 Nombre', desc: 'Nombre del usuario' },
                          { var: '{lastName}', label: '👥 Apellido', desc: 'Apellido del usuario' },
                          { var: '{fullName}', label: '👤 Nombre Completo', desc: 'Nombre y apellido' },
                          { var: '{phone}', label: '📱 Teléfono', desc: 'Número de teléfono' },
                          { var: '{barrio}', label: '🏠 Barrio', desc: 'Barrio de residencia' },
                          { var: '{canton}', label: '🏘️ Cantón', desc: 'Cantón de residencia' },
                          { var: '{provincia}', label: '🗺️ Provincia', desc: 'Provincia de residencia' },
                          { var: '{tabla}', label: '🎯 Tabla ID', desc: 'ID de la tabla asignada' },
                          { var: '{tableCode}', label: '🔢 Código Tabla', desc: 'Código de la tabla de bingo' },
                          { var: '{tablaEntregado}', label: '🔢 Estado Entrega', desc: 'Estado de entrega de la tabla' },
                          { var: '{ocrValidated}', label: '✅ OCR Validado', desc: 'Estado de validación OCR' }
                        ].map((item) => (
                          <button
                            key={item.var}
                            type="button"
                            onClick={() => {
                              const textarea = document.querySelector('textarea[value="' + campaignData.message + '"]') || 
                                             document.querySelector('textarea');
                              const start = textarea.selectionStart;
                              const end = textarea.selectionEnd;
                              const text = campaignData.message;
                              const newText = text.substring(0, start) + item.var + text.substring(end);
                              setCampaignData({ ...campaignData, message: newText });
                              
                              // Mantener focus y posición del cursor
                              setTimeout(() => {
                                textarea.focus();
                                textarea.setSelectionRange(start + item.var.length, start + item.var.length);
                              }, 10);
                            }}
                            className="px-2 py-1 text-xs bg-white border border-purple-200 text-purple-700 rounded-md hover:bg-purple-50 hover:border-purple-300 transition-colors"
                            title={item.desc}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <textarea
                      value={campaignData.message}
                      onChange={(e) => setCampaignData({ ...campaignData, message: e.target.value })}
                      rows={6}
                      placeholder="Ejemplo personalizado:&#10;&#10;¡Hola {firstName}! 👋&#10;&#10;Tu tabla de bingo {tableCode} está {tablaEntregado}.&#10;&#10;📍 Ubicación: {barrio}, {canton}, {provincia}&#10;📱 Confirma tu asistencia al {phone}&#10;&#10;¡Te esperamos {fullName}! 🎯✨"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono text-sm leading-relaxed"
                    />
                    
                    {/* Vista previa del mensaje mejorada */}
                    {campaignData.message.trim() && preview && preview.users.length > 0 && (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => setShowMessagePreview(!showMessagePreview)}
                          className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 mb-2"
                        >
                          <Eye size={16} />
                          {showMessagePreview ? 'Ocultar' : 'Mostrar'} Vista Previa del Mensaje
                          {showMessagePreview ? '👆' : '👇'}
                        </button>
                        
                        {showMessagePreview && (
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-medium text-blue-800">
                                📱 Así se verá el mensaje para {preview.users[0].first_name} {preview.users[0].last_name}:
                              </p>
                              <div className="flex gap-2">
                                <select 
                                  onChange={(e) => {
                                    // Cambiar usuario de ejemplo para la vista previa
                                    const userIndex = parseInt(e.target.value);
                                    if (userIndex >= 0) {
                                      // Forzar re-render moviendo el usuario seleccionado al primer lugar
                                      const users = [...preview.users];
                                      const selectedUser = users.splice(userIndex, 1)[0];
                                      users.unshift(selectedUser);
                                      setPreview({...preview, users});
                                    }
                                  }}
                                  className="text-xs px-2 py-1 border border-blue-300 rounded bg-white"
                                  defaultValue="0"
                                >
                                  <option value="0">Ver ejemplo con primer usuario</option>
                                  {preview.users.slice(1, 6).map((user, index) => (
                                    <option key={index + 1} value={index + 1}>
                                      Ejemplo con {user.first_name} {user.last_name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div className="text-sm text-blue-700 bg-white p-3 rounded border border-blue-200 leading-relaxed whitespace-pre-wrap shadow-sm">
                              {(() => {
                                const firstUser = preview.users[0];
                                return campaignData.message
                                  .replace(/{firstName}/g, firstUser.first_name || 'Usuario')
                                  .replace(/{lastName}/g, firstUser.last_name || 'Sin Apellido')
                                  .replace(/{fullName}/g, `${firstUser.first_name || 'Usuario'} ${firstUser.last_name || 'Sin Apellido'}`.trim())
                                  .replace(/{phone}/g, firstUser.phone || '0999999999')
                                  .replace(/{barrio}/g, firstUser.barrio || 'Sin barrio')
                                  .replace(/{canton}/g, firstUser.canton || 'Sin cantón')
                                  .replace(/{provincia}/g, firstUser.provincia || 'Sin provincia')
                                  .replace(/{tabla}/g, firstUser.id_tabla ? `#${firstUser.id_tabla}` : 'sin tabla asignada')
                                  .replace(/{tableCode}/g, firstUser.table_code || 'Sin tabla')
                                  .replace(/{tablaEntregado}/g, firstUser.tabla_entregado ? 'Entregada' : 'No entregada')
                                  .replace(/{ocrValidated}/g, firstUser.ocr_validated ? 'Validada' : 'Sin validar');
                              })()}
                            </div>
                            <div className="flex items-center justify-between mt-2 text-xs">
                              <span className="text-blue-600">
                                ✅ Cada usuario recibirá su versión personalizada
                              </span>
                              <span className="text-blue-500">
                                📊 {getActiveUsers().length} mensajes únicos se generarán
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-3">
                        <p className="text-xs text-gray-500">
                          💡 Usa variables para personalizar cada mensaje automáticamente
                        </p>
                        <button
                          type="button"
                          onClick={() => setCampaignData({ ...campaignData, message: '' })}
                          className="text-xs text-red-600 hover:text-red-800 underline"
                          title="Limpiar mensaje"
                        >
                          🗑️ Limpiar
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                          campaignData.message.length > 1000 ? 'bg-red-100 text-red-700' :
                          campaignData.message.length > 500 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {campaignData.message.length} chars
                        </span>
                        <span className="text-xs text-gray-400">
                          {Math.ceil(campaignData.message.length / 160)} SMS
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Adjuntar Imagen (Opcional) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <Image className="mr-2" size={16} />
                      Imagen Adjunta (Opcional)
                    </label>
                    
                    {/* Input de archivo */}
                    <div className="mb-3">
                      <input
                        id="campaign-image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                      <label
                        htmlFor="campaign-image"
                        className="flex items-center justify-center w-full h-32 px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-colors"
                      >
                        <div className="text-center">
                          <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                          <p className="text-sm text-gray-600">
                            <span className="font-medium text-purple-600">Haz clic para seleccionar</span> o arrastra una imagen aquí
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            PNG, JPG, GIF hasta 5MB
                          </p>
                        </div>
                      </label>
                    </div>

                    {/* Vista previa de imagen */}
                    {imagePreview && (
                      <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="flex items-start space-x-3">
                          <img
                            src={imagePreview}
                            alt="Vista previa"
                            className="w-20 h-20 object-cover rounded-lg border border-gray-300"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">
                              {selectedImage?.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {(selectedImage?.size / 1024 / 1024).toFixed(2)} MB • {selectedImage?.type}
                            </p>
                            <div className="flex items-center mt-2 space-x-2">
                              <CheckCircle className="text-green-500" size={16} />
                              <span className="text-xs text-green-600">Imagen lista para enviar</span>
                            </div>
                          </div>
                          <button
                            onClick={removeImage}
                            className="text-red-500 hover:text-red-700 p-1"
                            title="Remover imagen"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Error de imagen */}
                    {imageError && (
                      <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center">
                          <AlertCircle className="text-red-500 mr-2" size={16} />
                          <p className="text-sm text-red-700">{imageError}</p>
                        </div>
                      </div>
                    )}

                    {/* Información sobre imágenes */}
                    <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <FileImage className="text-blue-500 mt-0.5" size={14} />
                        <div>
                          <p className="font-medium text-blue-800 mb-1">💡 Información sobre imágenes:</p>
                          <ul className="space-y-1 text-blue-700">
                            <li>• La imagen se enviará junto con cada mensaje de WhatsApp</li>
                            <li>• Máximo 5MB, formatos: JPG, PNG, GIF, WebP</li>
                            <li>• Se recomienda imágenes cuadradas o panorámicas</li>
                            <li>• La imagen se almacena de forma segura en el servidor</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Configuración de envío */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Intervalo (minutos)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={campaignData.intervalMinutes}
                        onChange={(e) => setCampaignData({ ...campaignData, intervalMinutes: parseInt(e.target.value) || 2 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Máximo por hora
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={campaignData.maxMessagesPerHour}
                        onChange={(e) => setCampaignData({ ...campaignData, maxMessagesPerHour: parseInt(e.target.value) || 30 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                  </div>

                  {/* Botón crear campaña con confirmación extra */}
                  <div className="flex justify-end">
                    <button
                      onClick={async () => {
                        const activeUsers = getActiveUsers();
                        const result = await Swal.fire({
                          title: '⚠️ Crear Campaña',
                          html: `¿Estás seguro de crear esta campaña?<br><br>` +
                                `• Se enviará a <strong>${activeUsers.length}</strong> usuarios seleccionados<br>` +
                                `• Se han excluido <strong>${excludedUsers.length}</strong> usuarios<br><br>` +
                                `¿Continuar con la creación?`,
                          icon: 'question',
                          showCancelButton: true,
                          confirmButtonColor: '#8b5cf6',
                          cancelButtonColor: '#6b7280',
                          confirmButtonText: 'Sí, crear campaña',
                          cancelButtonText: 'Cancelar',
                          reverseButtons: true
                        });

                        if (result.isConfirmed) {
                          createCampaign();
                        }
                      }}
                      disabled={loading || !preview || (preview && getActiveUsers().length === 0)}
                      className="flex items-center px-8 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 transition-all duration-300 font-medium"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="mr-2 animate-spin" size={16} />
                          Creando...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2" size={16} />
                          Crear Campaña ({getActiveUsers().length} usuarios)
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'campaigns' && (
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center">
                <Activity className="mr-2" size={20} />
                Lista de Campañas
              </h3>
              
              {/* Botones de acción masiva */}
              <div className="flex items-center gap-2">
                <button
                  onClick={loadCampaigns}
                  disabled={loading}
                  className="flex items-center px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
                  title="Actualizar lista de campañas"
                >
                  <RefreshCw className={`mr-1 ${loading ? 'animate-spin' : ''}`} size={14} />
                  Actualizar
                </button>
                
                {campaigns.filter(c => c.status === 'completed' || c.status === 'cancelled').length > 0 && (
                  <button
                    onClick={deleteCompletedCampaigns}
                    disabled={loading}
                    className="flex items-center px-3 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
                    title="Eliminar todas las campañas completadas y canceladas"
                  >
                    <Trash2 className="mr-1" size={14} />
                    Limpiar Finalizadas ({campaigns.filter(c => c.status === 'completed' || c.status === 'cancelled').length})
                  </button>
                )}
              </div>
            </div>

            {/* Estadísticas rápidas de campañas */}
            {campaigns.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-blue-600">
                      {campaigns.length}
                    </p>
                    <p className="text-xs text-blue-800">Total</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-yellow-600">
                      {campaigns.filter(c => c.status === 'pending').length}
                    </p>
                    <p className="text-xs text-yellow-800">Pendientes</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">
                      {campaigns.filter(c => c.status === 'running').length}
                    </p>
                    <p className="text-xs text-blue-800">Activas</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      {campaigns.filter(c => c.status === 'completed').length}
                    </p>
                    <p className="text-xs text-green-800">Completadas</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">
                      {campaigns.filter(c => c.status === 'cancelled').length}
                    </p>
                    <p className="text-xs text-red-800">Canceladas</p>
                  </div>
                </div>
              </div>
            )}

            {campaigns.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="mx-auto text-gray-400 mb-3" size={48} />
                <p className="text-gray-600">No hay campañas creadas aún.</p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="mt-4 text-purple-600 hover:text-purple-700 font-medium"
                >
                  Crear primera campaña
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {campaigns.map(campaign => (
                  <div key={campaign.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800">{campaign.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {campaign.total_users} usuarios • Creada: {new Date(campaign.created_at).toLocaleDateString('es-ES')}
                        </p>
                        <div className="flex items-center mt-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            campaign.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            campaign.status === 'running' ? 'bg-blue-100 text-blue-800' :
                            campaign.status === 'paused' ? 'bg-orange-100 text-orange-800' :
                            campaign.status === 'completed' ? 'bg-green-100 text-green-800' :
                            campaign.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {campaign.status === 'pending' ? 'Pendiente' :
                             campaign.status === 'running' ? 'En progreso' :
                             campaign.status === 'paused' ? 'Pausada' :
                             campaign.status === 'completed' ? 'Completada' :
                             campaign.status === 'cancelled' ? 'Cancelada' : campaign.status}
                          </span>
                          
                          {/* Estadísticas rápidas */}
                          {campaign.total_messages !== undefined && (
                            <div className="ml-4 flex items-center space-x-3 text-xs">
                              <span className="flex items-center text-green-600">
                                <CheckCircle className="mr-1" size={12} />
                                {campaign.sent_messages || 0}
                              </span>
                              {campaign.error_messages > 0 && (
                                <span className="flex items-center text-red-600">
                                  <AlertCircle className="mr-1" size={12} />
                                  {campaign.error_messages}
                                </span>
                              )}
                              {campaign.pending_messages > 0 && (
                                <span className="flex items-center text-blue-600">
                                  <Clock className="mr-1" size={12} />
                                  {campaign.pending_messages}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {/* Botón Ver Logs */}
                        <button
                          onClick={() => getCampaignDetails(campaign.id)}
                          className="flex items-center px-3 py-1 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm"
                          title="Ver logs detallados de la campaña"
                        >
                          <FileText className="mr-1" size={14} />
                          Ver Logs
                        </button>
                        
                        {campaign.status === 'pending' && (
                          <>
                            <button
                              onClick={() => startCampaign(campaign.id)}
                              className="flex items-center px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                            >
                              <Play className="mr-1" size={14} />
                              Iniciar
                            </button>
                            <button
                              onClick={() => deleteCampaign(campaign.id, campaign.name, campaign.status)}
                              className="flex items-center px-3 py-1 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                              title="Eliminar campaña pendiente"
                            >
                              <Trash2 className="mr-1" size={14} />
                              Eliminar
                            </button>
                          </>
                        )}
                        
                        {campaign.status === 'running' && (
                          <>
                            <button
                              onClick={() => pauseCampaign(campaign.id)}
                              className="flex items-center px-3 py-1 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm"
                            >
                              <Square className="mr-1" size={14} />
                              Pausar
                            </button>
                            <button
                              onClick={() => cancelCampaign(campaign.id)}
                              className="flex items-center px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                            >
                              <X className="mr-1" size={14} />
                              Cancelar
                            </button>
                            <button
                              onClick={() => deleteCampaign(campaign.id, campaign.name, campaign.status)}
                              className="flex items-center px-3 py-1 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors text-sm"
                              title="⚠️ Eliminar campaña en progreso (peligroso)"
                            >
                              <Trash2 className="mr-1" size={14} />
                              Eliminar
                            </button>
                          </>
                        )}
                        
                        {campaign.status === 'paused' && (
                          <>
                            <button
                              onClick={() => resumeCampaign(campaign.id)}
                              className="flex items-center px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                            >
                              <Play className="mr-1" size={14} />
                              Reanudar
                            </button>
                            <button
                              onClick={() => cancelCampaign(campaign.id)}
                              className="flex items-center px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                            >
                              <X className="mr-1" size={14} />
                              Cancelar
                            </button>
                            <button
                              onClick={() => deleteCampaign(campaign.id, campaign.name, campaign.status)}
                              className="flex items-center px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                              title="Eliminar campaña pausada"
                            >
                              <Trash2 className="mr-1" size={14} />
                              Eliminar
                            </button>
                          </>
                        )}

                        {(campaign.status === 'completed' || campaign.status === 'cancelled') && (
                          <button
                            onClick={() => deleteCampaign(campaign.id, campaign.name, campaign.status)}
                            className="flex items-center px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                            title={`Eliminar campaña ${campaign.status === 'completed' ? 'completada' : 'cancelada'}`}
                          >
                            <Trash2 className="mr-1" size={14} />
                            Eliminar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <BarChart3 className="mr-2" size={20} />
              Estadísticas
            </h3>
            <div className="text-center py-8">
              <BarChart3 className="mx-auto text-gray-400 mb-3" size={48} />
              <p className="text-gray-600">Estadísticas próximamente...</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal de detalles de campaña */}
      <CampaignDetailsModal />
    </div>
  );
};

export default MensajeriaMasiva;