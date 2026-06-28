import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  StatusBar,
  ScrollView,
} from 'react-native';
import { 
  Bot, Send, ArrowLeft, RefreshCw, Lock, User, Plus, Trash2, Globe, FileText, Settings, Key, LogOut, MessageSquare
} from 'lucide-react-native';

interface Project {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  documents?: Document[];
}

interface Document {
  id: string;
  title: string;
  content: string;
  sourceType: string;
}

interface Agent {
  id: string;
  name: string;
  slug: string;
  systemInstruction: string;
  telegramToken: string | null;
}

interface Message {
  sender: 'user' | 'ai';
  content: string;
}

export default function App() {
  // Navigation & App modes
  const [appMode, setAppMode] = useState<'client' | 'merchant'>('client');
  const [currentView, setCurrentView] = useState<'home' | 'chat' | 'merchant_dashboard' | 'merchant_project' | 'merchant_agent'>('home');
  
  // API URL Configuration
  const [apiBaseUrl, setApiBaseUrl] = useState('https://tudominio.com'); // Default fallback, customizable
  
  // Customer mode states
  const [chatCodeInput, setChatCodeInput] = useState('');
  const [loadedAgent, setLoadedAgent] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  
  // Merchant auth states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [merchantToken, setMerchantToken] = useState('');
  const [merchantData, setMerchantData] = useState<any>(null);
  
  // Merchant panel lists
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectAgents, setProjectAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  // Forms states
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectSlug, setNewProjectSlug] = useState('');
  
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocContent, setNewDocContent] = useState('');

  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentSlug, setNewAgentSlug] = useState('');
  const [newAgentInstruction, setNewAgentInstruction] = useState('');

  const [editAgentTelegram, setEditAgentTelegram] = useState('');
  const [editAgentInstruction, setEditAgentInstruction] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [agentDocuments, setAgentDocuments] = useState<Document[]>([]);

  const handleProjectNameChange = (text: string) => {
    setNewProjectName(text);
    const generated = text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
    setNewProjectSlug(generated);
  };

  // Auto scroll
  const flatListRef = useRef<FlatList>(null);

  // Generate unique device ID
  useEffect(() => {
    const randomId = Math.random().toString(36).substring(2, 15);
    setDeviceId(`mobile-${randomId}`);
  }, []);

  const cleanUrl = (url: string) => {
    let baseUrl = url.trim();
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }
    return baseUrl;
  };

  // Helper to parse input share code/URL
  const parseIdentifier = (input: string) => {
    const cleanInput = input.trim();
    if (!cleanInput) return null;

    // UUID format check
    if (!cleanInput.includes('/') && cleanInput.length > 20) {
      return { agentId: cleanInput };
    }

    // URL or slug format check
    let path = cleanInput
      .replace(/^(https?:\/\/)?(www\.)?([a-zA-Z0-9-]+\.[a-z]{2,6})?/, '') // remove domain & protocol
      .replace(/^\/+|\/+$/g, ''); // remove leading/trailing slashes

    const parts = path.split('/');
    
    // Skip country code if 2 chars (e.g. es, us)
    if (parts[0] && parts[0].length === 2 && parts.length === 4) {
      parts.shift();
    }

    if (parts.length === 3) {
      return {
        username: parts[0],
        projectSlug: parts[1],
        agentSlug: parts[2]
      };
    }

    return null;
  };

  // LOAD AGENT FOR CUSTOMER CHAT
  const handleLoadAgent = async (inputCode: string) => {
    if (!inputCode.trim()) {
      setErrorMsg('Ingresa un enlace, Share Code o ID');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      const parsed = parseIdentifier(inputCode);
      if (!parsed) {
        throw new Error('Formato inválido. Usa: usuario/proyecto/IA o pega la URL.');
      }

      const baseUrl = cleanUrl(apiBaseUrl);
      let queryUrl = `${baseUrl}/api/public/agent`;

      if ('agentId' in parsed) {
        queryUrl += `?agentId=${parsed.agentId}`;
      } else {
        queryUrl += `?username=${parsed.username}&projectSlug=${parsed.projectSlug}&agentSlug=${parsed.agentSlug}`;
      }

      const res = await fetch(queryUrl);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Agente de IA no encontrado');
      }

      const agentData = data.agent;
      setLoadedAgent(agentData);
      setMessages([
        { sender: 'ai', content: `¡Hola! Bienvenido al chat de **${agentData.name}** (${agentData.merchantBusinessName}). ¿En qué te puedo asesorar?` }
      ]);
      setCurrentView('chat');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  // SEND MESSAGE IN CHAT
  const handleSendMessage = async () => {
    if (!inputValue.trim() || chatLoading || !loadedAgent) return;

    const text = inputValue.trim();
    setInputValue('');
    setMessages((prev) => [...prev, { sender: 'user', content: text }]);
    setChatLoading(true);

    try {
      const baseUrl = cleanUrl(apiBaseUrl);
      const res = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: loadedAgent.id,
          clientIdentifier: deviceId,
          message: text,
          platform: 'mobile',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'La IA no pudo responder.');
      }

      setMessages((prev) => [...prev, { sender: 'ai', content: data.response }]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { sender: 'ai', content: `⚠️ Error: ${err.message || 'Error de red.'}` },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // MERCHANT LOGIN
  const handleMerchantLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Completa todos los campos');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      const baseUrl = cleanUrl(apiBaseUrl);
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Credenciales incorrectas');
      }

      setMerchantToken(data.token);
      setMerchantData(data.merchant);
      
      // Load projects
      fetchProjects(data.token);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al autenticar.');
    } finally {
      setLoading(false);
    }
  };

  // FETCH PROJECTS
  const fetchProjects = async (token: string) => {
    try {
      const baseUrl = cleanUrl(apiBaseUrl);
      const res = await fetch(`${baseUrl}/api/projects`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.projects) {
        setProjects(data.projects);
        setCurrentView('merchant_dashboard');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // CREATE PROJECT
  const handleCreateProject = async () => {
    if (!newProjectName.trim() || !newProjectSlug.trim()) {
      setErrorMsg('Nombre y Slug son requeridos');
      return;
    }

    setLoading(true);
    try {
      const baseUrl = cleanUrl(apiBaseUrl);
      const res = await fetch(`${baseUrl}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${merchantToken}`
        },
        body: JSON.stringify({
          name: newProjectName,
          slug: newProjectSlug.toLowerCase(),
          description: '',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al crear el proyecto');
      }

      setProjects([...projects, data.project]);
      setNewProjectName('');
      setNewProjectSlug('');
      setErrorMsg('');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // SELECT PROJECT AND LOAD DETAIL + AGENTS
  const handleSelectProject = async (project: Project) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const baseUrl = cleanUrl(apiBaseUrl);
      
      // Load details & documents
      const resProj = await fetch(`${baseUrl}/api/projects/${project.id}`, {
        headers: { 'Authorization': `Bearer ${merchantToken}` },
      });
      const dataProj = await resProj.json();

      // Load agents
      const resAgents = await fetch(`${baseUrl}/api/projects/${project.id}/agents`, {
        headers: { 'Authorization': `Bearer ${merchantToken}` },
      });
      const dataAgents = await resAgents.json();

      if (resProj.ok && dataProj.project) {
        const fullProj = dataProj.project;
        setSelectedProject(fullProj);
        setProjectAgents(dataAgents.agents || []);
        setCurrentView('merchant_project');
      }
    } catch (err) {
      setErrorMsg('Error al cargar detalles del proyecto');
    } finally {
      setLoading(false);
    }
  };

  // LOAD DOCUMENTS LIST REFRESH FOR CHAT DE LA IA
  const reloadAgentDocuments = async (agentId: string) => {
    if (!selectedProject) return;
    try {
      const baseUrl = cleanUrl(apiBaseUrl);
      const resDocs = await fetch(`${baseUrl}/api/projects/${selectedProject.id}/agents/${agentId}/documents`, {
        headers: { 'Authorization': `Bearer ${merchantToken}` },
      });
      const dataDocs = await resDocs.json();
      if (resDocs.ok && dataDocs.documents) {
        setAgentDocuments(dataDocs.documents);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ADD TRAINING DOCUMENT
  const handleAddDocument = async () => {
    if (!newDocTitle.trim() || !newDocContent.trim() || !selectedProject || !selectedAgent) {
      setErrorMsg('El título y contenido son requeridos');
      return;
    }

    setLoading(true);
    try {
      const baseUrl = cleanUrl(apiBaseUrl);
      const res = await fetch(`${baseUrl}/api/projects/${selectedProject.id}/agents/${selectedAgent.id}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${merchantToken}`
        },
        body: JSON.stringify({
          title: newDocTitle,
          content: newDocContent,
          sourceType: 'text',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al cargar documento');
      }

      setNewDocTitle('');
      setNewDocContent('');
      reloadAgentDocuments(selectedAgent.id);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // DELETE TRAINING DOCUMENT
  const handleDeleteDocument = async (docId: string) => {
    if (!selectedProject || !selectedAgent) return;
    try {
      const baseUrl = cleanUrl(apiBaseUrl);
      await fetch(`${baseUrl}/api/projects/${selectedProject.id}/agents/${selectedAgent.id}/documents/${docId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${merchantToken}` },
      });
      reloadAgentDocuments(selectedAgent.id);
    } catch (err) {
      console.error(err);
    }
  };

  // CREATE AGENT
  const handleCreateAgent = async () => {
    if (!newAgentName.trim() || !newAgentSlug.trim() || !newAgentInstruction.trim() || !selectedProject) {
      setErrorMsg('Todos los campos del chat de la IA son requeridos');
      return;
    }

    setLoading(true);
    try {
      const baseUrl = cleanUrl(apiBaseUrl);
      const res = await fetch(`${baseUrl}/api/projects/${selectedProject.id}/agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${merchantToken}`
        },
        body: JSON.stringify({
          name: newAgentName,
          slug: newAgentSlug.toLowerCase(),
          systemInstruction: newAgentInstruction,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al crear el chat de la IA');
      }

      setProjectAgents([...projectAgents, data.agent]);
      setNewAgentName('');
      setNewAgentSlug('');
      setNewAgentInstruction('');
      setErrorMsg('');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // EDIT AGENT SELECTION
  const handleSelectAgent = async (agent: Agent) => {
    setSelectedAgent(agent);
    setEditAgentTelegram(agent.telegramToken || '');
    setEditAgentInstruction(agent.systemInstruction);
    setCurrentView('merchant_agent');

    // Load agent documents
    try {
      const baseUrl = cleanUrl(apiBaseUrl);
      const resDocs = await fetch(`${baseUrl}/api/projects/${selectedProject.id}/agents/${agent.id}/documents`, {
        headers: { 'Authorization': `Bearer ${merchantToken}` },
      });
      const dataDocs = await resDocs.json();
      if (resDocs.ok && dataDocs.documents) {
        setAgentDocuments(dataDocs.documents);
      } else {
        setAgentDocuments([]);
      }
    } catch (err) {
      console.error('Error fetching agent documents:', err);
      setAgentDocuments([]);
    }
  };

  // UPDATE AGENT DETAILS
  const handleUpdateAgent = async () => {
    if (!selectedProject || !selectedAgent) return;

    setLoading(true);
    try {
      const baseUrl = cleanUrl(apiBaseUrl);
      const res = await fetch(`${baseUrl}/api/projects/${selectedProject.id}/agents/${selectedAgent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${merchantToken}`
        },
        body: JSON.stringify({
          systemInstruction: editAgentInstruction,
          telegramToken: editAgentTelegram || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al actualizar agente');
      }

      // Update list
      setProjectAgents(projectAgents.map((a) => a.id === selectedAgent.id ? data.agent : a));
      setCurrentView('merchant_project');
      setSelectedAgent(null);
      setErrorMsg('');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // MERCHANT LOGOUT
  const handleLogout = () => {
    setMerchantToken('');
    setMerchantData(null);
    setProjects([]);
    setSelectedProject(null);
    setProjectAgents([]);
    setCurrentView('home');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#090b11" />

      {/* VIEW 1: HOME */}
      {currentView === 'home' && (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <View style={styles.logoBox}>
              <Bot size={32} color="#00e5ff" />
            </View>
            <Text style={styles.logoTitle}>Orchaix</Text>
            <Text style={styles.logoSubtitle}>Plataforma de Chats de la IA Multi-Agente No-Code</Text>
          </View>

          {/* Mode Switcher */}
          <View style={styles.modeTabs}>
            <TouchableOpacity 
              style={[styles.modeTab, appMode === 'client' && styles.modeTabActive]} 
              onPress={() => { setAppMode('client'); setErrorMsg(''); }}
            >
              <Globe size={16} color={appMode === 'client' ? '#090b11' : '#a1a1aa'} />
              <Text style={[styles.modeTabText, appMode === 'client' && styles.modeTabTextActive]}>Modo Cliente</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.modeTab, appMode === 'merchant' && styles.modeTabActive]} 
              onPress={() => { setAppMode('merchant'); setErrorMsg(''); }}
            >
              <Lock size={16} color={appMode === 'merchant' ? '#090b11' : '#a1a1aa'} />
              <Text style={[styles.modeTabText, appMode === 'merchant' && styles.modeTabTextActive]}>Modo Comercio</Text>
            </TouchableOpacity>
          </View>

          {/* Global server config */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Conectar al Servidor</Text>
            <TextInput
              style={styles.input}
              value={apiBaseUrl}
              onChangeText={setApiBaseUrl}
              placeholder="https://orchaix.com"
              placeholderTextColor="#52525b"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* CLIENT FLOW */}
          {appMode === 'client' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Ingresa Identificador del Chat de la IA</Text>
              <Text style={styles.helpText}>Introduce el link completo, share code (usuario/proyecto/chat) o UUID del chat.</Text>
              <TextInput
                style={styles.input}
                value={chatCodeInput}
                onChangeText={setChatCodeInput}
                placeholder="Ej: kadriser/calzado/ventas"
                placeholderTextColor="#52525b"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity 
                style={styles.buttonSubmit} 
                onPress={() => handleLoadAgent(chatCodeInput)}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#090b11" /> : <Text style={styles.buttonText}>Iniciar Chat de la IA</Text>}
              </TouchableOpacity>
            </View>
          )}

          {/* MERCHANT FLOW */}
          {appMode === 'merchant' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Acceso de Comercio</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="comercio@correo.com"
                  placeholderTextColor="#52525b"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Contraseña</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor="#52525b"
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
              <TouchableOpacity 
                style={styles.buttonSubmit} 
                onPress={handleMerchantLogin}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#090b11" /> : <Text style={styles.buttonText}>Ingresar al Panel</Text>}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* VIEW 2: ACTIVE CLIENT CHAT */}
      {currentView === 'chat' && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.navbar}>
            <TouchableOpacity onPress={() => setCurrentView('home')} style={styles.backBtn}>
              <ArrowLeft size={18} color="#a1a1aa" />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.navbarTitle} numberOfLines={1}>{loadedAgent?.name}</Text>
              <Text style={styles.navbarSubtitle} numberOfLines={1}>
                {loadedAgent?.projectName} | {loadedAgent?.merchantBusinessName}
              </Text>
            </View>
          </View>

          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(_, i) => i.toString()}
            renderItem={({ item }) => (
              <View style={[styles.msgRow, item.sender === 'user' ? styles.msgRowUser : styles.msgRowAi]}>
                <View style={[styles.msgBubble, item.sender === 'user' ? styles.bubbleUser : styles.bubbleAi]}>
                  <Text style={[styles.msgText, item.sender === 'user' ? styles.textUser : styles.textAi]}>
                    {item.content}
                  </Text>
                </View>
              </View>
            )}
            contentContainerStyle={styles.msgList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />

          {chatLoading && (
            <View style={styles.typingBox}>
              <ActivityIndicator size="small" color="#00e5ff" />
              <Text style={{ color: '#71717a', fontSize: 11, marginLeft: 6 }}>La IA está procesando...</Text>
            </View>
          )}

          <View style={styles.inputBar}>
            <TextInput
              style={styles.chatInput}
              value={inputValue}
              onChangeText={setInputValue}
              placeholder="Pregunta algo al agente..."
              placeholderTextColor="#71717a"
              editable={!chatLoading}
            />
            <TouchableOpacity 
              style={[styles.sendBtn, !inputValue.trim() && { opacity: 0.5 }]} 
              onPress={handleSendMessage}
              disabled={!inputValue.trim() || chatLoading}
            >
              <Send size={16} color="#090b11" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* VIEW 3: MERCHANT DASHBOARD (List of Projects) */}
      {currentView === 'merchant_dashboard' && (
        <View style={{ flex: 1 }}>
          <View style={styles.navbar}>
            <View style={{ flex: 1 }}>
              <Text style={styles.navbarTitle}>Panel de Control</Text>
              <Text style={styles.navbarSubtitle}>{merchantData?.businessName}</Text>
            </View>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
              <LogOut size={16} color="#ef4444" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 20 }}>
            {errorMsg ? (
              <View style={styles.errorBox}><Text style={styles.errorText}>{errorMsg}</Text></View>
            ) : null}

            {/* Create Project Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Crear Nuevo Proyecto</Text>
              <TextInput
                style={[styles.input, { marginBottom: 12 }]}
                placeholder="Nombre del Negocio / Proyecto"
                placeholderTextColor="#52525b"
                value={newProjectName}
                onChangeText={handleProjectNameChange}
              />
              <TouchableOpacity style={styles.buttonSubmit} onPress={handleCreateProject} disabled={loading}>
                <Text style={styles.buttonText}>Registrar Proyecto</Text>
              </TouchableOpacity>
            </View>

            {/* List Projects */}
            <Text style={styles.sectionTitle}>Tus Proyectos</Text>
            {projects.length === 0 ? (
              <Text style={styles.emptyText}>No tienes proyectos creados.</Text>
            ) : (
              projects.map((proj) => (
                <TouchableOpacity key={proj.id} style={styles.projItem} onPress={() => handleSelectProject(proj)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.projItemName}>{proj.name}</Text>
                    <Text style={styles.projItemSlug}>slug: {proj.slug}</Text>
                  </View>
                  <Bot size={16} color="#00e5ff" />
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      )}

      {/* VIEW 4: MERCHANT PROJECT DETAIL (Documents & Agents lists) */}
      {currentView === 'merchant_project' && selectedProject && (
        <View style={{ flex: 1 }}>
          <View style={styles.navbar}>
            <TouchableOpacity onPress={() => setCurrentView('merchant_dashboard')} style={styles.backBtn}>
              <ArrowLeft size={18} color="#a1a1aa" />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.navbarTitle}>{selectedProject.name}</Text>
              <Text style={styles.navbarSubtitle}>slug: {selectedProject.slug}</Text>
            </View>
          </View>

          <ScrollView style={{ padding: 20 }}>
            {errorMsg ? (
              <View style={styles.errorBox}><Text style={styles.errorText}>{errorMsg}</Text></View>
            ) : null}

            {/* SECTION 2: AI Agents creation */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Crear Chat de la IA</Text>
              <TextInput
                style={[styles.input, { marginBottom: 10 }]}
                placeholder="Nombre del Chat de la IA (ej: Ventas)"
                placeholderTextColor="#52525b"
                value={newAgentName}
                onChangeText={setNewAgentName}
              />
              <TextInput
                style={[styles.input, { marginBottom: 10 }]}
                placeholder="Slug URL del Chat de la IA (ej: ventas)"
                placeholderTextColor="#52525b"
                value={newAgentSlug}
                onChangeText={setNewAgentSlug}
                autoCapitalize="none"
              />
              <TextInput
                style={[styles.input, { height: 80, marginBottom: 12 }]}
                placeholder="Instrucciones de comportamiento (System Prompt)..."
                placeholderTextColor="#52525b"
                multiline
                value={newAgentInstruction}
                onChangeText={setNewAgentInstruction}
              />
              <TouchableOpacity style={styles.buttonSubmit} onPress={handleCreateAgent} disabled={loading}>
                <Text style={styles.buttonText}>Crear Chat de la IA</Text>
              </TouchableOpacity>
            </View>

            {/* Agents List */}
            <Text style={styles.sectionTitle}>Chats de la IA</Text>
            {projectAgents.length === 0 ? (
              <Text style={styles.emptyText}>No hay chats de la IA en este proyecto.</Text>
            ) : (
              projectAgents.map((ag) => (
                <TouchableOpacity key={ag.id} style={styles.agentItem} onPress={() => handleSelectAgent(ag)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.agentItemName}>{ag.name}</Text>
                    <Text style={styles.agentItemSlug}>Enlace: {merchantData?.username}/{selectedProject.slug}/{ag.slug}</Text>
                  </View>
                  <Settings size={16} color="#00e5ff" />
                </TouchableOpacity>
              ))
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      )}

      {/* VIEW 5: MERCHANT AGENT CONFIGURATION */}
      {currentView === 'merchant_agent' && selectedAgent && (
        <View style={{ flex: 1 }}>
          <View style={styles.navbar}>
            <TouchableOpacity onPress={() => setCurrentView('merchant_project')} style={styles.backBtn}>
              <ArrowLeft size={18} color="#a1a1aa" />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.navbarTitle}>Configurar: {selectedAgent.name}</Text>
              <Text style={styles.navbarSubtitle}>Chat de la IA</Text>
            </View>
          </View>

          <ScrollView style={{ padding: 20 }}>
            {errorMsg ? (
              <View style={styles.errorBox}><Text style={styles.errorText}>{errorMsg}</Text></View>
            ) : null}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Directivas del Chat de la IA</Text>
              <TextInput
                style={[styles.input, { height: 120, marginBottom: 16 }]}
                multiline
                value={editAgentInstruction}
                onChangeText={setEditAgentInstruction}
              />

              <Text style={styles.cardTitle}>Integración de Telegram (Token)</Text>
              <TextInput
                style={[styles.input, { marginBottom: 16 }]}
                placeholder="Token del bot (ej: 12345:AA-xx)"
                placeholderTextColor="#52525b"
                secureTextEntry
                value={editAgentTelegram}
                onChangeText={setEditAgentTelegram}
              />

              <TouchableOpacity style={styles.buttonSubmit} onPress={handleUpdateAgent} disabled={loading}>
                {loading ? <ActivityIndicator color="#090b11" /> : <Text style={styles.buttonText}>Guardar Ajustes</Text>}
              </TouchableOpacity>
            </View>

            {/* SECTION 1: Business Documents (RAG) linked to Agent */}
            <View style={[styles.card, { marginTop: 20 }]}>
              <Text style={styles.cardTitle}>Subir Datos del Comercio</Text>
              <TextInput
                style={[styles.input, { marginBottom: 10 }]}
                placeholder="Título del Documento (ej: Horarios)"
                placeholderTextColor="#52525b"
                value={newDocTitle}
                onChangeText={setNewDocTitle}
              />
              <TextInput
                style={[styles.input, { height: 80, marginBottom: 12 }]}
                placeholder="Contenido seco del comercio..."
                placeholderTextColor="#52525b"
                multiline
                value={newDocContent}
                onChangeText={setNewDocContent}
              />
              <TouchableOpacity style={styles.buttonSubmit} onPress={handleAddDocument} disabled={loading}>
                <Text style={styles.buttonText}>Cargar Datos</Text>
              </TouchableOpacity>
            </View>

            {/* Document list */}
            <Text style={styles.sectionTitle}>Datos Cargados en este Chat de la IA</Text>
            {agentDocuments.length === 0 ? (
              <Text style={styles.emptyText}>Sin datos cargados. Carga textos arriba.</Text>
            ) : (
              agentDocuments.map((doc) => (
                <View key={doc.id} style={styles.docItem}>
                  <View style={{ flex: 1 }}>
                     <Text style={styles.docItemTitle}>{doc.title}</Text>
                     <Text style={styles.docItemContent} numberOfLines={2}>{doc.content}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteDocument(doc.id)}>
                    <Trash2 size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#090b11',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  logoBox: {
    width: 60,
    height: 60,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  logoTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  logoSubtitle: {
    fontSize: 11,
    color: '#71717a',
    marginTop: 4,
    textAlign: 'center',
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#18181b',
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  modeTabActive: {
    backgroundColor: '#00e5ff',
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#a1a1aa',
  },
  modeTabTextActive: {
    color: '#090b11',
  },
  card: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  helpText: {
    fontSize: 10,
    color: '#71717a',
    marginBottom: 12,
    lineHeight: 14,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 10,
    color: '#a1a1aa',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#090b11',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    color: '#ffffff',
    fontSize: 13,
  },
  buttonSubmit: {
    backgroundColor: '#00e5ff',
    borderRadius: 8,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  buttonText: {
    color: '#090b11',
    fontSize: 13,
    fontWeight: 'bold',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 11,
    textAlign: 'center',
  },
  // NAVBAR
  navbar: {
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#090b11',
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#18181b',
  },
  navbarTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  navbarSubtitle: {
    fontSize: 10,
    color: '#00e5ff',
    marginTop: 2,
  },
  logoutBtn: {
    padding: 8,
  },
  // CHAT INTERFACE
  msgList: {
    padding: 16,
  },
  msgRow: {
    marginBottom: 12,
    maxWidth: '85%',
  },
  msgRowUser: {
    alignSelf: 'flex-end',
  },
  msgRowAi: {
    alignSelf: 'flex-start',
  },
  msgBubble: {
    padding: 10,
    borderRadius: 12,
  },
  bubbleUser: {
    backgroundColor: '#3b82f6',
    borderTopRightRadius: 0,
  },
  bubbleAi: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderTopLeftRadius: 0,
  },
  msgText: {
    fontSize: 12,
    lineHeight: 16,
  },
  textUser: {
    color: '#ffffff',
  },
  textAi: {
    color: '#e4e4e7',
  },
  typingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  inputBar: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#27272a',
    backgroundColor: '#090b11',
    alignItems: 'center',
  },
  chatInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 8,
    paddingHorizontal: 12,
    color: '#ffffff',
    fontSize: 12,
    marginRight: 8,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#00e5ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // MERCHANT DASHBOARD / LISTS
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#71717a',
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 10,
  },
  projItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    marginBottom: 8,
  },
  projItemName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  projItemSlug: {
    fontSize: 10,
    color: '#71717a',
    marginTop: 2,
  },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#27272a',
    marginBottom: 6,
  },
  docItemTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  docItemContent: {
    fontSize: 10,
    color: '#71717a',
    marginTop: 2,
  },
  agentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    marginBottom: 8,
  },
  agentItemName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  agentItemSlug: {
    fontSize: 10,
    color: '#71717a',
    marginTop: 2,
  },
  emptyText: {
    color: '#52525b',
    fontSize: 11,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 10,
  },
});
