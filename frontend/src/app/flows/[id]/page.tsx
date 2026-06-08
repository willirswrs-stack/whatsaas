'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ReactFlow,
    ReactFlowProvider,
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
    Node,
    NodeTypes,
    EdgeTypes,
    Handle,
    Position,
    BackgroundVariant,
    NodeProps,
    EdgeProps,
    getBezierPath,
    BaseEdge,
    useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { flowsApi, Flow, getNodesForChannel, getNodeColor, FlowNodeType } from '@/lib/flows';
import api from '@/lib/api';
import { instancesService, Instance } from '@/lib/instances';
import {
    metaTemplatesService,
    MetaTemplate,
    WabaAccount,
    CreateTemplateDto,
    TEMPLATE_LANGUAGES,
    TEMPLATE_CATEGORIES,
    getTemplateStatusColor,
    getTemplateStatusLabel
} from '@/lib/meta-templates';
// ============ TYPES ============
type CustomNodeProps = NodeProps<Node<any, string>>;

import { createContext, useContext } from 'react';
const FlowDataContext = createContext<{
    allFlows: Flow[];
    category: string;
    setCategory: (c: string) => void;
}>({ allFlows: [], category: '', setCategory: () => { } });

// ============ ESTILOS ============
const nodeStyles = {
    wrapper: `
        relative rounded-xl shadow-2xl transition-all min-w-[280px] max-w-[320px]
        border-2 border-transparent hover:border-[var(--primary)]
    `,
    floatingButtons: `
        absolute -top-10 left-1/2 -translate-x-1/2 flex gap-1 opacity-0 
        group-hover:opacity-100 transition-opacity z-10
    `,
    header: `
        px-4 py-3 rounded-t-xl flex items-center gap-3
    `,
    stats: `
        flex justify-center gap-6 py-2 text-center text-white/90
    `,
    body: `
        p-4 rounded-b-xl bg-white dark:bg-[var(--bg-glass)] 
        backdrop-blur-sm border border-t-0 border-gray-200 dark:border-[var(--border-color)]
    `,
    input: `
        w-full bg-gray-50 dark:bg-[var(--bg-secondary)] 
        border border-gray-200 dark:border-[var(--border-color)] 
        rounded-lg p-3 text-sm resize-none
        focus:outline-none focus:ring-2 focus:ring-[var(--primary)]
    `,
    variableInput: `
        flex items-center gap-2 bg-gray-50 dark:bg-[var(--bg-secondary)]
        border border-gray-200 dark:border-[var(--border-color)] 
        rounded-lg px-3 py-2 text-sm
    `,
    option: `
        flex items-center gap-2 text-sm text-gray-600 dark:text-[var(--text-muted)]
    `,
    typing: `
        flex items-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-[var(--border-color)]
    `,
    nextStep: `
        flex items-center justify-end gap-2 mt-3 text-sm text-gray-500 dark:text-[var(--text-muted)]
    `,
    handle: `
        !w-4 !h-4 !rounded-full !border-2 !border-white shadow-lg
    `,
};

// ============ ÍCONES ============
const Icons = {
    Message: () => (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
        </svg>
    ),
    Question: () => (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" />
        </svg>
    ),
    Play: () => (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
        </svg>
    ),
    Help: () => (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    ),
    Emoji: () => (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2" />
            <line x1="9" y1="9" x2="9.01" y2="9" />
            <line x1="15" y1="9" x2="15.01" y2="9" />
        </svg>
    ),
    Send: () => (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
        </svg>
    ),
    Typing: () => (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="6" cy="12" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="18" cy="12" r="2" />
        </svg>
    ),
    Duplicate: () => (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
    ),
    Delete: () => (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
    ),
};

// ============ EDGE CUSTOMIZADO COM BOTÃO DE DELETE ============
function DeletableEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
}: EdgeProps) {
    const { setEdges } = useReactFlow();
    const [isHovered, setIsHovered] = useState(false);

    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    const onEdgeClick = (event: React.MouseEvent) => {
        event.stopPropagation();
        event.preventDefault();
        setEdges((edges) => edges.filter((edge) => edge.id !== id));
    };

    return (
        <g
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Área invisível maior para detectar hover */}
            <path
                d={edgePath}
                fill="none"
                strokeWidth={20}
                stroke="transparent"
                style={{ cursor: 'pointer' }}
            />
            {/* Edge visível */}
            <BaseEdge
                path={edgePath}
                markerEnd={markerEnd}
                style={{
                    ...style,
                    stroke: isHovered ? '#ef4444' : '#14b8a6',
                    strokeWidth: isHovered ? 3 : 2,
                }}
            />
            {/* Botão de delete - SVG nativo */}
            {isHovered && (
                <g
                    onClick={onEdgeClick}
                    style={{ cursor: 'pointer' }}
                    transform={`translate(${labelX}, ${labelY})`}
                >
                    {/* Círculo de fundo */}
                    <circle
                        r={14}
                        fill="#ef4444"
                        stroke="white"
                        strokeWidth={2}
                    />
                    {/* Ícone X */}
                    <path
                        d="M-5,-5 L5,5 M5,-5 L-5,5"
                        stroke="white"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                    />
                </g>
            )}
        </g>
    );
}
// ============ HOOK PARA ATUALIZAR CONFIGURAÇÃO DO NÓ ============
function useNodeConfig(nodeId: string, initialConfig: any) {
    const { setNodes, setEdges, getNodes } = useReactFlow();

    const updateConfig = useCallback((updates: Record<string, any>) => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === nodeId) {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            config: {
                                ...(node.data?.config || {}),
                                ...updates
                            }
                        }
                    };
                }
                return node;
            })
        );
    }, [nodeId, setNodes]);

    const deleteNode = useCallback(() => {
        setNodes((nds) => nds.filter((node) => node.id !== nodeId));
        setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    }, [nodeId, setNodes, setEdges]);

    const duplicateNode = useCallback(() => {
        const nodes = getNodes();
        const currentNode = nodes.find((n) => n.id === nodeId);
        if (!currentNode) return;

        const newId = `${currentNode.type}-${Date.now()}`;
        const newNode = {
            ...currentNode,
            id: newId,
            position: {
                x: currentNode.position.x + 50,
                y: currentNode.position.y + 50
            },
            data: {
                ...currentNode.data,
                config: { ...(currentNode.data?.config || {}) }
            }
        };
        setNodes((nds) => [...nds, newNode]);
    }, [nodeId, getNodes, setNodes]);

    return { updateConfig, deleteNode, duplicateNode };
}

// ============ NÓ DE MENSAGEM ============
function MessageNode({ data, selected, id }: CustomNodeProps) {
    const { updateConfig, deleteNode, duplicateNode } = useNodeConfig(id, data.config);
    const [message, setMessage] = useState(data.config?.message || '');
    const [typingSeconds, setTypingSeconds] = useState(data.config?.typingSeconds || 0);
    const [asForwarded, setAsForwarded] = useState(data.config?.asForwarded || false);

    // Sincronizar mudanças automaticamente (debounced)
    useEffect(() => {
        const timeout = setTimeout(() => {
            updateConfig({ message, typingSeconds, asForwarded });
        }, 500);
        return () => clearTimeout(timeout);
    }, [message, typingSeconds, asForwarded, updateConfig]);

    return (
        <div className={`group ${nodeStyles.wrapper} ${selected ? 'ring-2 ring-[var(--primary)] ring-offset-2' : ''}`}>
            {/* Floating Buttons */}
            <div className={nodeStyles.floatingButtons}>
                <button onClick={(e) => { e.stopPropagation(); duplicateNode(); }} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-gray-700">
                    <Icons.Duplicate /> Duplicar
                </button>
                <button onClick={(e) => { e.stopPropagation(); deleteNode(); }} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-red-600">
                    <Icons.Delete /> Remover
                </button>
            </div>

            {/* Header with Stats */}
            <div className={nodeStyles.header} style={{ backgroundColor: '#14b8a6' }}>
                <div className={nodeStyles.stats}>
                    <div>
                        <div className="text-2xl font-bold">{data.stats?.executing || 0}</div>
                        <div className="text-xs flex items-center gap-1">Executando <Icons.Help /></div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold">{data.stats?.sent || 0}</div>
                        <div className="text-xs flex items-center gap-1">Enviados <Icons.Help /></div>
                    </div>
                </div>
            </div>

            {/* Title Bar */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#14b8a6]">
                <div className="flex items-center gap-2 text-white">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                        <Icons.Message />
                    </div>
                    <div>
                        <div className="font-semibold text-sm">Enviar mensagem</div>
                        <div className="text-xs opacity-80">Texto</div>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-white">
                    <button className="p-1 hover:bg-white/20 rounded"><Icons.Help /></button>
                    <button className="p-1 hover:bg-white/20 rounded"><Icons.Play /></button>
                </div>
            </div>

            {/* Body */}
            <div className={nodeStyles.body}>
                <p className="text-xs text-gray-400 italic mb-2">Digite sua mensagem abaixo</p>

                <textarea
                    className={nodeStyles.input}
                    placeholder="Olá! Como posso ajudar?"
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                />

                <div className={`${nodeStyles.variableInput} mt-2`}>
                    <Icons.Emoji />
                    <input
                        type="text"
                        className="flex-1 bg-transparent border-none outline-none text-sm"
                        placeholder="Digite @ p/ utilizar os campos"
                        onClick={(e) => e.stopPropagation()}
                    />
                    <button className="text-[#14b8a6]"><Icons.Send /></button>
                </div>

                <label className={`${nodeStyles.option} mt-3`}>
                    <input
                        type="checkbox"
                        checked={asForwarded}
                        onChange={(e) => setAsForwarded(e.target.checked)}
                        className="w-4 h-4 rounded"
                    />
                    Marcar como encaminhada
                </label>

                <div className={nodeStyles.typing}>
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-500">
                        <Icons.Typing />
                    </div>
                    <span className="text-sm">Status digitando</span>
                    <select
                        className="ml-auto bg-transparent border border-gray-200 dark:border-[var(--border-color)] rounded px-2 py-1 text-sm"
                        value={typingSeconds}
                        onChange={(e) => setTypingSeconds(Number(e.target.value))}
                    >
                        {[0, 1, 2, 3, 5, 10].map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                    <span className="text-sm">segundos</span>
                </div>

                <div className={nodeStyles.nextStep}>
                    <span>Próximo passo</span>
                    <div className="w-3 h-3 rounded-full bg-[#14b8a6] border-2 border-white shadow"></div>
                </div>
            </div>

            {/* Handles */}
            <Handle
                type="target"
                position={Position.Left}
                className={`${nodeStyles.handle} !bg-[#14b8a6]`}
            />
            <Handle
                type="source"
                position={Position.Right}
                className={`${nodeStyles.handle} !bg-[#14b8a6]`}
            />
        </div>
    );
}

// ============ NÓ DE PERGUNTA ============
function QuestionNode({ data, selected, id }: CustomNodeProps) {
    const { updateConfig, deleteNode, duplicateNode } = useNodeConfig(id, data.config || {});
    const config = data.config || {};
    const [question, setQuestion] = useState(config?.question || '');
    const [saveField, setSaveField] = useState(config?.saveField || '');
    const [timeoutSeconds, setTimeoutSeconds] = useState(config?.timeoutSeconds || 0);
    const [typingSeconds, setTypingSeconds] = useState(config?.typingSeconds || 0);

    // Sincronizar mudanças automaticamente (debounced)
    useEffect(() => {
        const timeout = setTimeout(() => {
            updateConfig({ question, saveField, timeoutSeconds, typingSeconds });
        }, 500);
        return () => clearTimeout(timeout);
    }, [question, saveField, timeoutSeconds, typingSeconds]);

    return (
        <div className={`group ${nodeStyles.wrapper} ${selected ? 'ring-2 ring-[var(--primary)] ring-offset-2' : ''}`}>
            {/* Floating Buttons */}
            <div className={nodeStyles.floatingButtons}>
                <button onClick={(e) => { e.stopPropagation(); duplicateNode(); }} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-gray-700">
                    <Icons.Duplicate /> Duplicar
                </button>
                <button onClick={(e) => { e.stopPropagation(); deleteNode(); }} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-red-600">
                    <Icons.Delete /> Remover
                </button>
            </div>

            {/* Header with Stats */}
            <div className={nodeStyles.header} style={{ backgroundColor: '#14b8a6' }}>
                <div className={nodeStyles.stats}>
                    <div>
                        <div className="text-2xl font-bold">{data.stats?.executing || 0}</div>
                        <div className="text-xs flex items-center gap-1">Executando <Icons.Help /></div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold">{data.stats?.sent || 0}</div>
                        <div className="text-xs flex items-center gap-1">Enviados <Icons.Help /></div>
                    </div>
                </div>
            </div>

            {/* Title Bar */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#14b8a6]">
                <div className="flex items-center gap-2 text-white">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                        <Icons.Question />
                    </div>
                    <div>
                        <div className="font-semibold text-sm">Fazer uma pergunta</div>
                        <div className="text-xs opacity-80">Pergunta</div>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-white">
                    <button className="p-1 hover:bg-white/20 rounded"><Icons.Help /></button>
                    <button className="p-1 hover:bg-white/20 rounded"><Icons.Play /></button>
                </div>
            </div>

            {/* Body */}
            <div className={nodeStyles.body}>
                <p className="text-xs text-gray-400 italic mb-2">Digite sua mensagem abaixo</p>

                <textarea
                    className={nodeStyles.input}
                    placeholder="Qual seu nome?"
                    rows={3}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                />

                <div className={`${nodeStyles.variableInput} mt-2`}>
                    <Icons.Emoji />
                    <input
                        type="text"
                        className="flex-1 bg-transparent border-none outline-none text-sm"
                        placeholder="Digite @ p/ utilizar os campos"
                        onClick={(e) => e.stopPropagation()}
                    />
                    <button className="text-[#14b8a6]"><Icons.Send /></button>
                </div>

                {/* Salvar resposta em */}
                <div className="flex items-center gap-2 mt-3 text-sm">
                    <span className="text-gray-600 dark:text-[var(--text-muted)]">Salvar resposta em</span>
                    <select
                        className="flex-1 bg-transparent border border-gray-200 dark:border-[var(--border-color)] rounded px-2 py-1"
                        value={saveField}
                        onChange={(e) => setSaveField(e.target.value)}
                    >
                        <option value="">Selecione</option>
                        <option value="nome">Nome</option>
                        <option value="email">Email</option>
                        <option value="telefone">Telefone</option>
                    </select>
                    <button className="text-gray-400"><Icons.Help /></button>
                    <button className="text-gray-400">⋮</button>
                </div>

                {/* Se não responder em */}
                <div className="flex items-center gap-2 mt-2 text-sm">
                    <span className="text-gray-600 dark:text-[var(--text-muted)]">Se não responder em</span>
                    <select
                        className="w-16 bg-transparent border border-gray-200 dark:border-[var(--border-color)] rounded px-2 py-1"
                        value={timeoutSeconds}
                        onChange={(e) => setTimeoutSeconds(Number(e.target.value))}
                    >
                        {[0, 30, 60, 120, 300].map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                    <span>Segundos</span>
                    <button className="text-gray-400"><Icons.Help /></button>
                </div>

                {/* Caso a resposta seja inválida */}
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-400">
                    <span>Caso a resposta seja inválida</span>
                    <button><Icons.Help /></button>
                </div>

                <div className={nodeStyles.typing}>
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-500">
                        <Icons.Typing />
                    </div>
                    <span className="text-sm">Status digitando</span>
                    <select
                        className="ml-auto bg-transparent border border-gray-200 dark:border-[var(--border-color)] rounded px-2 py-1 text-sm"
                        value={typingSeconds}
                        onChange={(e) => setTypingSeconds(Number(e.target.value))}
                    >
                        {[0, 1, 2, 3, 5, 10].map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                    <span className="text-sm">segundos</span>
                </div>

                <div className={nodeStyles.nextStep}>
                    <span>Próximo passo</span>
                    <div className="w-3 h-3 rounded-full bg-[#14b8a6] border-2 border-white shadow"></div>
                </div>
            </div>

            {/* Handles */}
            <Handle
                type="target"
                position={Position.Left}
                className={`${nodeStyles.handle} !bg-gray-400`}
            />
            {/* Sucesso (resposta válida) - Teal */}
            <Handle
                type="source"
                position={Position.Right}
                id="success"
                className={`${nodeStyles.handle} !bg-[#14b8a6]`}
                style={{ top: '70%' }}
            />
            {/* Timeout (não respondeu) - Laranja */}
            <Handle
                type="source"
                position={Position.Right}
                id="timeout"
                className={`${nodeStyles.handle} !bg-[#f97316]`}
                style={{ top: '80%' }}
            />
            {/* Inválido - Amarelo */}
            <Handle
                type="source"
                position={Position.Right}
                id="invalid"
                className={`${nodeStyles.handle} !bg-[#fbbf24]`}
                style={{ top: '90%' }}
            />
        </div>
    );
}

// ============ NÓ DE INÍCIO ============
function StartNode({ data, selected, id }: CustomNodeProps) {
    const { updateConfig } = useNodeConfig(id, data.config || {});
    const [showHoursModal, setShowHoursModal] = useState(false);
    const [showTriggerModal, setShowTriggerModal] = useState(false);

    const businessHours = data.config?.businessHours || { enabled: false, days: [], timezone: 'America/Sao_Paulo' };
    const triggers = data.config?.triggers || [];

    return (
        <div className={`group ${nodeStyles.wrapper} ${selected ? 'ring-2 ring-[var(--primary)] ring-offset-2' : ''}`}>
            <div className="px-6 py-4 rounded-xl bg-gradient-to-r from-[#14b8a6] to-[#0d9488] text-white">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                        <Icons.Play />
                    </div>
                    <div>
                        <div className="font-bold">Início do fluxo</div>
                        <div className="text-xs opacity-80">
                            Esse é o início do fluxo, ele pode ser iniciado através das suas campanhas ou gatilhos.
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 text-sm opacity-80">
                    <span>Próximo passo</span>
                    <div className="w-3 h-3 rounded-full bg-white shadow"></div>
                </div>
            </div>

            {/* Seção Condições */}
            <div className="mt-2 rounded-xl border border-gray-200 dark:border-[var(--border-color)] overflow-hidden">
                <div className="px-4 py-2 bg-[#fbbf24] text-gray-800 font-semibold text-sm flex items-center gap-2">
                    ⚙️ Configurações de Início
                </div>
                <div className="p-4 bg-white dark:bg-[var(--bg-glass)] space-y-3">
                    <div 
                        className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 p-2 rounded-lg transition-colors"
                        onClick={() => setShowHoursModal(true)}
                    >
                        <span className="text-2xl">🕐</span>
                        <div className="flex-1">
                            <div className="font-medium text-sm">Horário de funcionamento</div>
                            <div className="text-xs text-gray-400">
                                {businessHours.enabled ? 'Ativado' : 'Sem configuração'}
                            </div>
                        </div>
                        <div className="text-[#14b8a6] text-xs">Editar</div>
                    </div>
                    <div 
                        className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 p-2 rounded-lg transition-colors"
                        onClick={() => setShowTriggerModal(true)}
                    >
                        <span className="text-2xl">⚡</span>
                        <div className="flex-1">
                            <div className="font-medium text-sm">Gatilhos (Palavras-chave)</div>
                            <div className="text-xs text-gray-400">
                                {triggers.length > 0 ? `${triggers.length} gatilho(s)` : 'Nenhum gatilho'}
                            </div>
                        </div>
                        <div className="text-[#14b8a6] text-xs">Configurar</div>
                    </div>
                </div>
            </div>

            <Handle
                type="source"
                position={Position.Right}
                className={`${nodeStyles.handle} !bg-[#14b8a6]`}
            />

            {/* Modais de Configuração */}
            {showHoursModal && (
                <BusinessHoursModal 
                    isOpen={showHoursModal} 
                    onClose={() => setShowHoursModal(false)} 
                    config={businessHours}
                    onSave={(newHours: any) => {
                        updateConfig({ businessHours: newHours });
                        setShowHoursModal(false);
                    }}
                />
            )}

            {showTriggerModal && (
                <TriggersModal 
                    isOpen={showTriggerModal} 
                    onClose={() => setShowTriggerModal(false)} 
                    triggers={triggers}
                    onSave={(newTriggers: any) => {
                        updateConfig({ triggers: newTriggers });
                        setShowTriggerModal(false);
                    }}
                />
            )}
        </div>
    );
}

// ============ MODAL HORÁRIO DE FUNCIONAMENTO ============
function BusinessHoursModal({ isOpen, onClose, config, onSave }: any) {
    const [enabled, setEnabled] = useState(config.enabled || false);
    const [days, setDays] = useState(config.days || []);
    
    const weekDays = [
        { id: 'mon', label: 'Seg' },
        { id: 'tue', label: 'Ter' },
        { id: 'wed', label: 'Qua' },
        { id: 'thu', label: 'Qui' },
        { id: 'fri', label: 'Sex' },
        { id: 'sat', label: 'Sáb' },
        { id: 'sun', label: 'Dom' },
    ];

    const toggleDay = (dayId: string) => {
        if (days.find((d: any) => d.id === dayId)) {
            setDays(days.filter((d: any) => d.id !== dayId));
        } else {
            setDays([...days, { id: dayId, start: '08:00', end: '18:00' }]);
        }
    };

    const updateTime = (dayId: string, field: 'start' | 'end', value: string) => {
        setDays(days.map((d: any) => d.id === dayId ? { ...d, [field]: value } : d));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110]" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-xl w-full max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-gray-200 dark:border-[var(--border-color)] flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                        <span>🕐</span> Horário de Funcionamento
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>
                
                <div className="p-6 space-y-4">
                    <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-white/5 rounded-lg cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={enabled} 
                            onChange={(e) => setEnabled(e.target.checked)}
                            className="w-5 h-5 rounded border-gray-300 text-[#14b8a6] focus:ring-[#14b8a6]"
                        />
                        <div className="flex-1">
                            <div className="font-medium text-sm">Ativar restrição de horário</div>
                            <div className="text-xs text-gray-500">O fluxo só responderá nos horários definidos abaixo.</div>
                        </div>
                    </label>

                    {enabled && (
                        <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                            {weekDays.map(day => {
                                const dayConfig = days.find((d: any) => d.id === day.id);
                                return (
                                    <div key={day.id} className="flex items-center gap-3 p-2 border-b border-gray-100 dark:border-white/5 last:border-0">
                                        <button 
                                            onClick={() => toggleDay(day.id)}
                                            className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs transition-colors ${
                                                dayConfig ? 'bg-[#14b8a6] text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-400'
                                            }`}
                                        >
                                            {day.label}
                                        </button>
                                        
                                        {dayConfig ? (
                                            <div className="flex items-center gap-2 flex-1">
                                                <input 
                                                    type="time" 
                                                    value={dayConfig.start}
                                                    onChange={(e) => updateTime(day.id, 'start', e.target.value)}
                                                    className="flex-1 bg-transparent border border-gray-200 dark:border-white/10 rounded px-2 py-1 text-sm"
                                                />
                                                <span className="text-gray-400 text-xs">até</span>
                                                <input 
                                                    type="time" 
                                                    value={dayConfig.end}
                                                    onChange={(e) => updateTime(day.id, 'end', e.target.value)}
                                                    className="flex-1 bg-transparent border border-gray-200 dark:border-white/10 rounded px-2 py-1 text-sm"
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex-1 text-sm text-gray-400 italic">Fechado</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-gray-200 dark:border-[var(--border-color)] flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-500 text-sm">Cancelar</button>
                    <button 
                        onClick={() => onSave({ enabled, days, timezone: 'America/Sao_Paulo' })}
                        className="px-6 py-2 bg-[#14b8a6] text-white rounded-lg text-sm font-medium hover:bg-[#0d9488]"
                    >
                        Salvar
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============ MODAL GATILHOS ============
function TriggersModal({ isOpen, onClose, triggers, onSave }: any) {
    const [localTriggers, setLocalTriggers] = useState(triggers || []);
    const [newKeyword, setNewKeyword] = useState('');

    const addTrigger = () => {
        if (!newKeyword.trim()) return;
        setLocalTriggers([...localTriggers, { type: 'keyword', value: newKeyword.trim(), match: 'exact' }]);
        setNewKeyword('');
    };

    const removeTrigger = (index: number) => {
        setLocalTriggers(localTriggers.filter((_: any, i: number) => i !== index));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110]" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-xl w-full max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-gray-200 dark:border-[var(--border-color)] flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                        <span>⚡</span> Gatilhos de Fluxo
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>
                
                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-500">
                        O fluxo será iniciado automaticamente quando o contato enviar uma das palavras-chave abaixo.
                    </p>

                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={newKeyword}
                            onChange={(e) => setNewKeyword(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && addTrigger()}
                            placeholder="Ex: Ola, Quero saber mais"
                            className="flex-1 bg-transparent border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm"
                        />
                        <button 
                            onClick={addTrigger}
                            className="px-4 py-2 bg-[#14b8a6] text-white rounded-lg text-sm font-medium"
                        >
                            +
                        </button>
                    </div>

                    <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                        {localTriggers.map((t: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-100 dark:border-white/5">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-600 rounded uppercase font-bold">{t.match}</span>
                                    <span className="text-sm font-medium">{t.value}</span>
                                </div>
                                <button onClick={() => removeTrigger(idx)} className="text-red-400 hover:text-red-600">🗑️</button>
                            </div>
                        ))}
                        {localTriggers.length === 0 && (
                            <div className="text-center py-8 text-gray-400 text-sm italic">
                                Nenhum gatilho configurado.
                            </div>
                        )}
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-gray-200 dark:border-[var(--border-color)] flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-500 text-sm">Cancelar</button>
                    <button 
                        onClick={() => onSave(localTriggers)}
                        className="px-6 py-2 bg-[#14b8a6] text-white rounded-lg text-sm font-medium hover:bg-[#0d9488]"
                    >
                        Salvar Gatilhos
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============ NÓ DE LINK ============
function LinkNode({ data, selected, id }: CustomNodeProps) {
    const { updateConfig, deleteNode, duplicateNode } = useNodeConfig(id, data.config || {});
    const config = data.config || {};
    const [url, setUrl] = useState(config?.url || '');
    const [typingSeconds, setTypingSeconds] = useState(config?.typingSeconds || 0);

    // Sincronizar mudanças automaticamente (debounced)
    useEffect(() => {
        const timeout = setTimeout(() => {
            updateConfig({ url, typingSeconds });
        }, 500);
        return () => clearTimeout(timeout);
    }, [url, typingSeconds]);

    return (
        <div className={`group ${nodeStyles.wrapper} ${selected ? 'ring-2 ring-[var(--primary)] ring-offset-2' : ''}`}>
            {/* Floating Buttons */}
            <div className={nodeStyles.floatingButtons}>
                <button onClick={(e) => { e.stopPropagation(); duplicateNode(); }} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-gray-700">
                    <Icons.Duplicate /> Duplicar
                </button>
                <button onClick={(e) => { e.stopPropagation(); deleteNode(); }} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-red-600">
                    <Icons.Delete /> Remover
                </button>
            </div>

            {/* Header with Stats */}
            <div className={nodeStyles.header} style={{ backgroundColor: '#14b8a6' }}>
                <div className={nodeStyles.stats}>
                    <div>
                        <div className="text-2xl font-bold">{data.stats?.executing || 0}</div>
                        <div className="text-xs flex items-center gap-1">Executando <Icons.Help /></div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold">{data.stats?.sent || 0}</div>
                        <div className="text-xs flex items-center gap-1">Enviados <Icons.Help /></div>
                    </div>
                </div>
            </div>

            {/* Title Bar */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#14b8a6]">
                <div className="flex items-center gap-2 text-white">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                        🔗
                    </div>
                    <div>
                        <div className="font-semibold text-sm">Enviar Link</div>
                        <div className="text-xs opacity-80">Link</div>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-white">
                    <button className="p-1 hover:bg-white/20 rounded"><Icons.Help /></button>
                    <button className="p-1 hover:bg-white/20 rounded"><Icons.Play /></button>
                </div>
            </div>

            {/* Body */}
            <div className={nodeStyles.body}>
                <p className="text-xs text-gray-400 italic mb-2">Insira o link abaixo</p>

                <input
                    type="url"
                    className={nodeStyles.input}
                    placeholder="https://exemplo.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                />

                {/* Aviso WhatsApp Web */}
                <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                        ⚠️ Opção disponível apenas para canais WhatsApp Web
                    </p>
                </div>

                <div className={nodeStyles.typing}>
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-500">
                        <Icons.Typing />
                    </div>
                    <span className="text-sm">Status digitando</span>
                    <select
                        className="ml-auto bg-transparent border border-gray-200 dark:border-[var(--border-color)] rounded px-2 py-1 text-sm"
                        value={typingSeconds}
                        onChange={(e) => setTypingSeconds(Number(e.target.value))}
                    >
                        {[0, 1, 2, 3, 5, 10].map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                    <span className="text-sm">segundos</span>
                </div>

                <div className={nodeStyles.nextStep}>
                    <span>Próximo passo</span>
                    <div className="w-3 h-3 rounded-full bg-[#14b8a6] border-2 border-white shadow"></div>
                </div>
            </div>

            {/* Handles */}
            <Handle
                type="target"
                position={Position.Left}
                className={`${nodeStyles.handle} !bg-[#14b8a6]`}
            />
            <Handle
                type="source"
                position={Position.Right}
                className={`${nodeStyles.handle} !bg-[#14b8a6]`}
            />
        </div>
    );
}

// ============ COMPONENTE DE UPLOAD DE MÍDIA ============
interface MediaUploadProps {
    label: string;
    accept: string;
    maxSize?: string;
    onFileChange?: (file: File | null) => void;
    onUrlChange?: (url: string) => void;
    showUrlOption?: boolean;
    initialUrl?: string;
    initialFileName?: string;
}

function MediaUploadArea({
    label,
    accept,
    maxSize = "60 MB",
    onFileChange,
    onUrlChange,
    showUrlOption = true,
    initialUrl = '',
    initialFileName = ''
}: MediaUploadProps) {
    const [mode, setMode] = useState<'upload' | 'url'>(initialUrl && !initialFileName ? 'url' : 'upload');
    const [url, setUrl] = useState(initialUrl);
    const [fileName, setFileName] = useState<string | null>(initialFileName || null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Update state if initial values change (e.g. on load)
    useEffect(() => {
        if (initialUrl) setUrl(initialUrl);
        if (initialFileName) setFileName(initialFileName);
    }, [initialUrl, initialFileName]);

    const uploadToBackend = async (file: File): Promise<string | null> => {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await api.post('/uploads/media', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            return response.data.url;
        } catch (error: any) {
            console.error('Upload error:', error);
            throw new Error(error.response?.data?.message || 'Erro no upload');
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFileName(file.name);
            setIsUploading(true);
            setUploadError(null);
            onFileChange?.(file);

            try {
                const uploadedUrl = await uploadToBackend(file);
                if (uploadedUrl) {
                    onUrlChange?.(uploadedUrl);
                }
            } catch (error: any) {
                setUploadError(error.message || 'Falha no upload');
                setFileName(null);
            } finally {
                setIsUploading(false);
            }
        }
    };

    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="bg-gray-50 dark:bg-[var(--bg-glass)] rounded-lg p-4 text-center">
            <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                onChange={handleFileSelect}
                className="hidden"
            />

            {isUploading ? (
                <div className="mb-3">
                    <div className="w-12 h-12 mx-auto mb-2 flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-[#a855f7] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Enviando arquivo...</p>
                </div>
            ) : fileName ? (
                <div className="mb-3">
                    <div className="w-12 h-12 mx-auto mb-2 text-green-500 flex items-center justify-center">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <p className="text-sm text-green-600 dark:text-green-400 font-medium truncate px-2">{fileName}</p>
                    <button
                        onClick={handleButtonClick}
                        className="text-xs text-gray-500 hover:text-gray-700 mt-1"
                    >
                        Trocar arquivo
                    </button>
                </div>
            ) : (
                <>
                    <div className="w-12 h-12 mx-auto mb-2 text-gray-400 flex items-center justify-center">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">{label}</p>
                    <p className="text-xs text-gray-400 mb-2">Tamanho máximo do arquivo</p>
                    <p className="text-sm font-semibold text-[#a855f7] mb-3">{maxSize}</p>

                    <button
                        onClick={handleButtonClick}
                        className="px-6 py-2 bg-[#a855f7] text-white rounded-lg text-sm font-medium hover:bg-[#9333ea] transition-colors mb-2"
                    >
                        Carregar
                    </button>
                </>
            )}

            {uploadError && (
                <p className="text-sm text-red-500 mt-2">{uploadError}</p>
            )}

            {showUrlOption && (
                <button
                    onClick={() => setMode(mode === 'upload' ? 'url' : 'upload')}
                    className="block mx-auto text-xs text-[#a855f7] hover:underline"
                >
                    Inserir por link
                </button>
            )}

            {mode === 'url' && (
                <input
                    type="url"
                    value={url}
                    onChange={(e) => {
                        setUrl(e.target.value);
                        onUrlChange?.(e.target.value);
                    }}
                    placeholder="https://..."
                    className="mt-2 w-full px-3 py-2 border border-gray-200 dark:border-[var(--border-color)] rounded-lg text-sm"
                    onClick={(e) => e.stopPropagation()}
                />
            )}
        </div>
    );
}


// ============ NÓ DE VÍDEO ============
function VideoNode({ data, selected, id }: CustomNodeProps) {
    const { updateConfig, deleteNode, duplicateNode } = useNodeConfig(id, data.config);
    const [caption, setCaption] = useState(data.config?.caption || '');
    const [format, setFormat] = useState(data.config?.format || 'padrao');
    const [asForwarded, setAsForwarded] = useState(data.config?.asForwarded || false);
    const [mediaUrl, setMediaUrl] = useState(data.config?.mediaUrl || '');

    const handleCaptionChange = (value: string) => {
        setCaption(value);
        updateConfig({ caption: value });
    };

    const handleFormatChange = (value: string) => {
        setFormat(value);
        updateConfig({ format: value });
    };

    const handleForwardedChange = (checked: boolean) => {
        setAsForwarded(checked);
        updateConfig({ asForwarded: checked });
    };

    const handleFileChange = (file: File | null) => {
        if (file) {
            // Em produção, faria upload para servidor e obteria URL
            // Por ora, apenas salva o nome do arquivo
            updateConfig({ fileName: file.name, fileSize: file.size });
        }
    };

    const handleUrlChange = (url: string) => {
        setMediaUrl(url);
        updateConfig({ mediaUrl: url });
    };

    return (
        <div className={`group ${nodeStyles.wrapper} ${selected ? 'ring-2 ring-[var(--primary)] ring-offset-2' : ''}`}>
            <div className={nodeStyles.floatingButtons}>
                <button onClick={duplicateNode} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-gray-700">
                    <Icons.Duplicate /> Duplicar
                </button>
                <button onClick={deleteNode} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-red-600">
                    <Icons.Delete /> Remover
                </button>
            </div>

            <div className={nodeStyles.header} style={{ backgroundColor: '#a855f7' }}>
                <div className={nodeStyles.stats}>
                    <div>
                        <div className="text-2xl font-bold">{data.stats?.executing || 0}</div>
                        <div className="text-xs flex items-center gap-1">Executando <Icons.Help /></div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold">{data.stats?.sent || 0}</div>
                        <div className="text-xs flex items-center gap-1">Enviados <Icons.Help /></div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between px-4 py-2 bg-[#a855f7]">
                <div className="flex items-center gap-2 text-white">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">🎬</div>
                    <div>
                        <div className="font-semibold text-sm">Enviar vídeo</div>
                        <div className="text-xs opacity-80">Vídeo</div>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-white">
                    <button className="p-1 hover:bg-white/20 rounded"><Icons.Help /></button>
                    <button className="p-1 hover:bg-white/20 rounded"><Icons.Play /></button>
                </div>
            </div>

            <div className={nodeStyles.body}>
                <MediaUploadArea
                    label="Carregar vídeos do computador"
                    accept="video/*"
                    maxSize="60 MB"
                    onFileChange={handleFileChange}
                    onUrlChange={handleUrlChange}
                    initialUrl={data.config?.mediaUrl}
                    initialFileName={data.config?.fileName}
                />

                <div className="flex items-center gap-2 mt-3 text-sm">
                    <span className="text-gray-600 dark:text-[var(--text-muted)]">Formato:</span>
                    <select
                        className="flex-1 bg-transparent border border-gray-200 dark:border-[var(--border-color)] rounded px-2 py-1"
                        value={format}
                        onChange={(e) => handleFormatChange(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <option value="padrao">Padrão</option>
                        <option value="gif">GIF</option>
                    </select>
                </div>

                <div className={`${nodeStyles.variableInput} mt-3`}>
                    <span>😊</span>
                    <input
                        type="text"
                        className="flex-1 bg-transparent border-none outline-none text-sm"
                        placeholder="Digite @ p/ utilizar os campos"
                        value={caption}
                        onChange={(e) => handleCaptionChange(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                    />
                    <span className="text-xs text-gray-400">{caption.length}/1024</span>
                </div>

                <label className={`${nodeStyles.option} mt-3`}>
                    <input type="checkbox" checked={asForwarded} onChange={(e) => handleForwardedChange(e.target.checked)} className="w-4 h-4 rounded" />
                    Marcar como encaminhada
                </label>

                <div className={nodeStyles.nextStep}>
                    <span>Próximo passo</span>
                    <div className="w-3 h-3 rounded-full bg-[#a855f7] border-2 border-white shadow"></div>
                </div>
            </div>

            <Handle type="target" position={Position.Left} className={`${nodeStyles.handle} !bg-[#a855f7]`} />
            <Handle type="source" position={Position.Right} className={`${nodeStyles.handle} !bg-[#a855f7]`} />
        </div>
    );
}

// ============ NÓ DE IMAGEM ============
function ImageNode({ data, selected, id }: CustomNodeProps) {
    const { updateConfig, deleteNode, duplicateNode } = useNodeConfig(id, data.config);
    const [caption, setCaption] = useState(data.config?.caption || '');
    const [asForwarded, setAsForwarded] = useState(data.config?.asForwarded || false);

    const handleFileChange = (file: File | null) => {
        if (file) updateConfig({ fileName: file.name, fileSize: file.size });
    };
    const handleUrlChange = (url: string) => updateConfig({ mediaUrl: url });
    const handleCaptionChange = (value: string) => { setCaption(value); updateConfig({ caption: value }); };
    const handleForwardedChange = (checked: boolean) => { setAsForwarded(checked); updateConfig({ asForwarded: checked }); };

    return (
        <div className={`group ${nodeStyles.wrapper} ${selected ? 'ring-2 ring-[var(--primary)] ring-offset-2' : ''}`}>
            <div className={nodeStyles.floatingButtons}>
                <button onClick={duplicateNode} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-gray-700">
                    <Icons.Duplicate /> Duplicar
                </button>
                <button onClick={deleteNode} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-red-600">
                    <Icons.Delete /> Remover
                </button>
            </div>

            <div className={nodeStyles.header} style={{ backgroundColor: '#a855f7' }}>
                <div className={nodeStyles.stats}>
                    <div>
                        <div className="text-2xl font-bold">{data.stats?.executing || 0}</div>
                        <div className="text-xs flex items-center gap-1">Executando <Icons.Help /></div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold">{data.stats?.sent || 0}</div>
                        <div className="text-xs flex items-center gap-1">Enviados <Icons.Help /></div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between px-4 py-2 bg-[#a855f7]">
                <div className="flex items-center gap-2 text-white">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">🖼️</div>
                    <div>
                        <div className="font-semibold text-sm">Enviar imagem</div>
                        <div className="text-xs opacity-80">Imagem</div>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-white">
                    <button className="p-1 hover:bg-white/20 rounded"><Icons.Help /></button>
                    <button className="p-1 hover:bg-white/20 rounded"><Icons.Play /></button>
                </div>
            </div>

            <div className={nodeStyles.body}>
                <MediaUploadArea
                    label="Carregar imagens do computador"
                    accept="image/*"
                    maxSize="5 MB"
                    onFileChange={handleFileChange}
                    onUrlChange={handleUrlChange}
                    initialUrl={data.config?.mediaUrl}
                    initialFileName={data.config?.fileName}
                />

                <div className={`${nodeStyles.variableInput} mt-3`}>
                    <span>😊</span>
                    <input
                        type="text"
                        className="flex-1 bg-transparent border-none outline-none text-sm"
                        placeholder="Digite @ p/ utilizar os campos"
                        value={caption}
                        onChange={(e) => handleCaptionChange(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                    />
                    <span className="text-xs text-gray-400">0/1024</span>
                </div>

                <label className={`${nodeStyles.option} mt-3`}>
                    <input type="checkbox" checked={asForwarded} onChange={(e) => handleForwardedChange(e.target.checked)} className="w-4 h-4 rounded" />
                    Marcar como encaminhada
                </label>

                <div className={nodeStyles.nextStep}>
                    <span>Próximo passo</span>
                    <div className="w-3 h-3 rounded-full bg-[#a855f7] border-2 border-white shadow"></div>
                </div>
            </div>

            <Handle type="target" position={Position.Left} className={`${nodeStyles.handle} !bg-[#a855f7]`} />
            <Handle type="source" position={Position.Right} className={`${nodeStyles.handle} !bg-[#a855f7]`} />
        </div>
    );
}

// ============ NÓ DE STICKER ============
function StickerNode({ data, selected, id }: CustomNodeProps) {
    const { updateConfig, deleteNode, duplicateNode } = useNodeConfig(id, data.config);

    const handleFileChange = (file: File | null) => {
        if (file) updateConfig({ fileName: file.name, fileSize: file.size });
    };

    return (
        <div className={`group ${nodeStyles.wrapper} ${selected ? 'ring-2 ring-[var(--primary)] ring-offset-2' : ''}`}>
            <div className={nodeStyles.floatingButtons}>
                <button onClick={duplicateNode} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-gray-700">
                    <Icons.Duplicate /> Duplicar
                </button>
                <button onClick={deleteNode} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-red-600">
                    <Icons.Delete /> Remover
                </button>
            </div>

            <div className={nodeStyles.header} style={{ backgroundColor: '#a855f7' }}>
                <div className={nodeStyles.stats}>
                    <div>
                        <div className="text-2xl font-bold">{data.stats?.executing || 0}</div>
                        <div className="text-xs flex items-center gap-1">Executando <Icons.Help /></div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold">{data.stats?.sent || 0}</div>
                        <div className="text-xs flex items-center gap-1">Enviados <Icons.Help /></div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between px-4 py-2 bg-[#a855f7]">
                <div className="flex items-center gap-2 text-white">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">😀</div>
                    <div>
                        <div className="font-semibold text-sm">Enviar Sticker</div>
                        <div className="text-xs opacity-80">Sticker</div>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-white">
                    <button className="p-1 hover:bg-white/20 rounded"><Icons.Help /></button>
                    <button className="p-1 hover:bg-white/20 rounded"><Icons.Play /></button>
                </div>
            </div>

            <div className={nodeStyles.body}>
                <MediaUploadArea
                    label="Carregar imagens do computador"
                    accept="image/*"
                    maxSize="100 KB"
                    showUrlOption={false}
                    onFileChange={handleFileChange}
                    onUrlChange={(url) => updateConfig({ mediaUrl: url })}
                    initialUrl={data.config?.mediaUrl}
                    initialFileName={data.config?.fileName}
                />

                <div className={`${nodeStyles.variableInput} mt-3`}>
                    <input
                        type="text"
                        className="flex-1 bg-transparent border-none outline-none text-sm text-gray-400"
                        placeholder="Faça o upload acima"
                        disabled
                    />
                </div>

                <div className={nodeStyles.nextStep}>
                    <span>Próximo passo</span>
                    <div className="w-3 h-3 rounded-full bg-[#a855f7] border-2 border-white shadow"></div>
                </div>
            </div>

            <Handle type="target" position={Position.Left} className={`${nodeStyles.handle} !bg-[#a855f7]`} />
            <Handle type="source" position={Position.Right} className={`${nodeStyles.handle} !bg-[#a855f7]`} />
        </div>
    );
}

// ============ NÓ DE ÁUDIO ============
function AudioNode({ data, selected, id }: CustomNodeProps) {
    const { updateConfig, deleteNode, duplicateNode } = useNodeConfig(id, data.config);
    const [asForwarded, setAsForwarded] = useState(data.config?.asForwarded || false);
    const [recordingSeconds, setRecordingSeconds] = useState(data.config?.recordingSeconds || 0);

    const handleFileChange = (file: File | null) => {
        if (file) updateConfig({ fileName: file.name, fileSize: file.size });
    };
    const handleUrlChange = (url: string) => updateConfig({ mediaUrl: url });
    const handleForwardedChange = (checked: boolean) => { setAsForwarded(checked); updateConfig({ asForwarded: checked }); };
    const handleRecordingChange = (value: number) => { setRecordingSeconds(value); updateConfig({ recordingSeconds: value }); };

    return (
        <div className={`group ${nodeStyles.wrapper} ${selected ? 'ring-2 ring-[var(--primary)] ring-offset-2' : ''}`}>
            <div className={nodeStyles.floatingButtons}>
                <button onClick={duplicateNode} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-gray-700">
                    <Icons.Duplicate /> Duplicar
                </button>
                <button onClick={deleteNode} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-red-600">
                    <Icons.Delete /> Remover
                </button>
            </div>

            <div className={nodeStyles.header} style={{ backgroundColor: '#a855f7' }}>
                <div className={nodeStyles.stats}>
                    <div>
                        <div className="text-2xl font-bold">{data.stats?.executing || 0}</div>
                        <div className="text-xs flex items-center gap-1">Executando <Icons.Help /></div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold">{data.stats?.sent || 0}</div>
                        <div className="text-xs flex items-center gap-1">Enviados <Icons.Help /></div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between px-4 py-2 bg-[#a855f7]">
                <div className="flex items-center gap-2 text-white">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">🎵</div>
                    <div>
                        <div className="font-semibold text-sm">Enviar áudio</div>
                        <div className="text-xs opacity-80">Áudio</div>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-white">
                    <button className="p-1 hover:bg-white/20 rounded"><Icons.Help /></button>
                    <button className="p-1 hover:bg-white/20 rounded"><Icons.Play /></button>
                </div>
            </div>

            <div className={nodeStyles.body}>
                <MediaUploadArea
                    label="Carregar audios do computador"
                    accept="audio/*"
                    maxSize="16 MB"
                    onFileChange={handleFileChange}
                    onUrlChange={handleUrlChange}
                    initialUrl={data.config?.mediaUrl}
                    initialFileName={data.config?.fileName}
                />

                <div className={`${nodeStyles.variableInput} mt-3`}>
                    <span>➕</span>
                    <input
                        type="text"
                        className="flex-1 bg-transparent border-none outline-none text-sm"
                        placeholder="Grave o áudio ao lado →"
                        disabled
                    />
                    <button className="w-8 h-8 rounded-full bg-[#a855f7] text-white flex items-center justify-center hover:bg-[#9333ea]">
                        🎤
                    </button>
                </div>

                <label className={`${nodeStyles.option} mt-3`}>
                    <input type="checkbox" checked={asForwarded} onChange={(e) => handleForwardedChange(e.target.checked)} className="w-4 h-4 rounded" />
                    Marcar como encaminhada
                </label>

                <div className={nodeStyles.typing}>
                    <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-500">
                        🎙️
                    </div>
                    <span className="text-sm">Status gravando</span>
                    <select
                        className="ml-auto bg-transparent border border-gray-200 dark:border-[var(--border-color)] rounded px-2 py-1 text-sm"
                        value={recordingSeconds}
                        onChange={(e) => handleRecordingChange(Number(e.target.value))}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {[0, 1, 2, 3, 5, 10].map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                    <span className="text-sm">segundos</span>
                </div>

                <div className={nodeStyles.nextStep}>
                    <span>Próximo passo</span>
                    <div className="w-3 h-3 rounded-full bg-[#a855f7] border-2 border-white shadow"></div>
                </div>
            </div>

            <Handle type="target" position={Position.Left} className={`${nodeStyles.handle} !bg-[#a855f7]`} />
            <Handle type="source" position={Position.Right} className={`${nodeStyles.handle} !bg-[#a855f7]`} />
        </div>
    );
}

// ============ NÓ DE DOCUMENTO ============
function DocumentNode({ data, selected, id }: CustomNodeProps) {
    const { updateConfig, deleteNode, duplicateNode } = useNodeConfig(id, data.config);
    const [caption, setCaption] = useState(data.config?.caption || '');
    const [asForwarded, setAsForwarded] = useState(data.config?.asForwarded || false);

    return (
        <div className={`group ${nodeStyles.wrapper} ${selected ? 'ring-2 ring-[var(--primary)] ring-offset-2' : ''}`}>
            <div className={nodeStyles.floatingButtons}>
                <button onClick={(e) => { e.stopPropagation(); duplicateNode(); }} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-gray-700">
                    <Icons.Duplicate /> Duplicar
                </button>
                <button onClick={(e) => { e.stopPropagation(); deleteNode(); }} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-red-600">
                    <Icons.Delete /> Remover
                </button>
            </div>

            <div className={nodeStyles.header} style={{ backgroundColor: '#a855f7' }}>
                <div className={nodeStyles.stats}>
                    <div>
                        <div className="text-2xl font-bold">{data.stats?.executing || 0}</div>
                        <div className="text-xs flex items-center gap-1">Executando <Icons.Help /></div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold">{data.stats?.sent || 0}</div>
                        <div className="text-xs flex items-center gap-1">Enviados <Icons.Help /></div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between px-4 py-2 bg-[#a855f7]">
                <div className="flex items-center gap-2 text-white">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">📄</div>
                    <div>
                        <div className="font-semibold text-sm">Enviar documento</div>
                        <div className="text-xs opacity-80">Documento</div>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-white">
                    <button className="p-1 hover:bg-white/20 rounded"><Icons.Help /></button>
                    <button className="p-1 hover:bg-white/20 rounded"><Icons.Play /></button>
                </div>
            </div>

            <div className={nodeStyles.body}>
                <MediaUploadArea
                    label="Carregar documentos do computador"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                    maxSize="100 MB"
                    onFileChange={(file) => file && updateConfig({ fileName: file.name, fileSize: file.size })}
                    onUrlChange={(url) => updateConfig({ mediaUrl: url })}
                    initialUrl={data.config?.mediaUrl}
                    initialFileName={data.config?.fileName}
                />

                <div className={`${nodeStyles.variableInput} mt-3`}>
                    <span>😊</span>
                    <input
                        type="text"
                        className="flex-1 bg-transparent border-none outline-none text-sm"
                        placeholder="Digite @ p/ utilizar os campos"
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                    />
                    <span className="text-xs text-gray-400">0/1024</span>
                </div>

                <label className={`${nodeStyles.option} mt-3`}>
                    <input type="checkbox" checked={asForwarded} onChange={(e) => setAsForwarded(e.target.checked)} className="w-4 h-4 rounded" />
                    Marcar como encaminhada
                </label>

                <div className={nodeStyles.nextStep}>
                    <span>Próximo passo</span>
                    <div className="w-3 h-3 rounded-full bg-[#a855f7] border-2 border-white shadow"></div>
                </div>
            </div>

            <Handle type="target" position={Position.Left} className={`${nodeStyles.handle} !bg-[#a855f7]`} />
            <Handle type="source" position={Position.Right} className={`${nodeStyles.handle} !bg-[#a855f7]`} />
        </div>
    );
}

// ============ MODAL DE TERMOS DE USO ============
interface TermsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAccept: () => void;
}

function ButtonsTermsModal({ isOpen, onClose, onAccept }: TermsModalProps) {
    const [accepted, setAccepted] = useState(false);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-gray-200 dark:border-[var(--border-color)] flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Termos de uso sobre os Botões</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                <div className="p-6 max-h-[60vh] overflow-y-auto text-sm text-gray-600 dark:text-gray-300 space-y-4">
                    <h4 className="font-bold">Termos de Uso para a Funcionalidade de Botões no WhatsApp</h4>

                    <div>
                        <h5 className="font-semibold">1. Aceitação dos Termos</h5>
                        <p>Ao optar pela ativação da funcionalidade de botões no WhatsApp por meio da WhatSaas, o cliente aceita integralmente os termos e condições estabelecidos neste documento.</p>
                    </div>

                    <div>
                        <h5 className="font-semibold">2. Descrição da Funcionalidade</h5>
                        <p>A funcionalidade de botões no WhatsApp permite que mensagens enviadas por meio da WhatSaas incluam botões interativos, que facilitam a interação do usuário final com o conteúdo, como respostas rápidas ou redirecionamento para URLs específicas.</p>
                    </div>

                    <div>
                        <h5 className="font-semibold">3. Isenção de Responsabilidade</h5>
                        <p>A WhatSaas não se responsabiliza por quaisquer alterações, suspensões ou remoções da funcionalidade de botões realizadas pela Meta (empresa responsável pelo WhatsApp). A Meta possui a prerrogativa de modificar ou descontinuar essa funcionalidade a qualquer momento, sem necessidade de aviso prévio.</p>
                    </div>

                    <div>
                        <h5 className="font-semibold">4. Aviso de Risco</h5>
                        <p>Os clientes que optarem por ativar e utilizar a funcionalidade de botões no WhatsApp devem estar cientes de que a Meta pode, a seu exclusivo critério, modificar, restringir ou descontinuar o uso dessa funcionalidade sem prévia comunicação. A WhatSaas não será responsável por quaisquer prejuízos, perda de dados ou interrupção de serviços decorrentes dessas ações por parte da Meta.</p>
                    </div>

                    <div>
                        <h5 className="font-semibold">5. Limitação de Responsabilidade</h5>
                        <p>Em hipótese alguma a WhatSaas será responsável por qualquer dano direto, indireto, incidental, especial ou consequente, ou por qualquer perda de receita, lucro, dados, uso, ou outra vantagem econômica resultante da remoção ou banimento da funcionalidade de botões no WhatsApp pela Meta.</p>
                    </div>

                    <div>
                        <h5 className="font-semibold">6. Alterações nos Termos</h5>
                        <p>A WhatSaas se reserva o direito de modificar estes termos a qualquer momento e recomenda que os clientes revisem os termos regularmente. O uso continuado da funcionalidade após a publicação de quaisquer alterações constitui a aceitação tácita das novas condições.</p>
                    </div>

                    <div>
                        <h5 className="font-semibold">7. Disposições Gerais</h5>
                        <p>Estes termos representam o acordo completo entre o cliente e a WhatSaas em relação ao uso da funcionalidade de botões no WhatsApp. Qualquer disposição destes termos que seja considerada inválida ou inexequível não afetará a validade das demais disposições.</p>
                    </div>

                    <div>
                        <h5 className="font-semibold">8. Contato</h5>
                        <p>Para quaisquer dúvidas ou solicitações relacionadas a estes termos, entre em contato com nossa equipe de suporte.</p>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-gray-200 dark:border-[var(--border-color)] space-y-4">
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={accepted}
                            onChange={(e) => setAccepted(e.target.checked)}
                            className="w-4 h-4 rounded"
                        />
                        Li e concordo com os termos acima.
                    </label>
                    <div className="flex justify-center gap-4">
                        <button
                            onClick={() => { if (accepted) { onAccept(); onClose(); } }}
                            disabled={!accepted}
                            className="px-8 py-2 bg-[#14b8a6] text-white rounded-lg font-medium hover:bg-[#0d9488] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Confirmar
                        </button>
                        <button onClick={onClose} className="text-gray-500 hover:underline text-sm">
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============ NÓ DE BOTÕES PADRÃO ============
function ButtonsDefaultNode({ data, selected, id }: CustomNodeProps) {
    const { updateConfig, deleteNode, duplicateNode } = useNodeConfig(id, data.config);
    const [message, setMessage] = useState(data.config?.message || '');
    const [format, setFormat] = useState(data.config?.format || 'texto');
    const [saveField, setSaveField] = useState(data.config?.saveField || '');
    const [buttons, setButtons] = useState<Array<{ text: string }>>(data.config?.buttons || [{ text: '' }]);
    const [timeoutSeconds, setTimeoutSeconds] = useState(data.config?.timeoutSeconds || 0);
    const [showTerms, setShowTerms] = useState(false);

    const addButton = () => {
        if (buttons.length < 3) {
            setButtons([...buttons, { text: '' }]);
        }
    };

    const updateButton = (idx: number, text: string) => {
        const newButtons = [...buttons];
        newButtons[idx] = { text };
        setButtons(newButtons);
    };

    return (
        <div className={`group ${nodeStyles.wrapper} ${selected ? 'ring-2 ring-[var(--primary)] ring-offset-2' : ''}`}>
            <div className={nodeStyles.floatingButtons}>
                <button onClick={(e) => { e.stopPropagation(); duplicateNode(); }} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-gray-700">
                    <Icons.Duplicate /> Duplicar
                </button>
                <button onClick={(e) => { e.stopPropagation(); deleteNode(); }} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-red-600">
                    <Icons.Delete /> Remover
                </button>
            </div>

            <div className={nodeStyles.header} style={{ backgroundColor: '#0f766e' }}>
                <div className="flex justify-between text-white text-center">
                    <div className="flex-1">
                        <div className="text-2xl font-bold">{data.stats?.executing || 0}</div>
                        <div className="text-xs flex items-center justify-center gap-1">Executando <Icons.Help /></div>
                    </div>
                    <div className="flex-1">
                        <div className="text-2xl font-bold">{data.stats?.sent || 0}</div>
                        <div className="text-xs flex items-center justify-center gap-1">Enviados <Icons.Help /></div>
                    </div>
                    <div className="flex-1">
                        <div className="text-2xl font-bold">0%</div>
                        <div className="text-xs flex items-center justify-center gap-1">Clicado <Icons.Help /></div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between px-4 py-2 bg-[#0f766e]">
                <div className="flex items-center gap-2 text-white">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">📋</div>
                    <div>
                        <div className="font-semibold text-sm">Enviar opções</div>
                        <div className="text-xs opacity-80">Botões</div>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-white">
                    <button className="p-1 hover:bg-white/20 rounded"><Icons.Help /></button>
                    <button className="p-1 hover:bg-white/20 rounded"><Icons.Play /></button>
                </div>
            </div>

            <div className={nodeStyles.body}>
                <p className="text-xs text-gray-400 italic mb-2">Digite sua mensagem abaixo</p>

                <div className={nodeStyles.variableInput}>
                    <span>📎</span>
                    <span>😊</span>
                    <input
                        type="text"
                        className="flex-1 bg-transparent border-none outline-none text-sm"
                        placeholder="Digite @ p/ utilizar os campos"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-600 dark:text-[var(--text-muted)]">Formato:</span>
                        <select
                            className="flex-1 bg-transparent border border-gray-200 dark:border-[var(--border-color)] rounded px-2 py-1"
                            value={format}
                            onChange={(e) => setFormat(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <option value="texto">Texto</option>
                            <option value="lista">Lista</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-600 dark:text-[var(--text-muted)]">Salvar em:</span>
                        <select
                            className="flex-1 bg-transparent border border-gray-200 dark:border-[var(--border-color)] rounded px-2 py-1"
                            value={saveField}
                            onChange={(e) => setSaveField(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <option value="">Selecione</option>
                            <option value="resposta">Resposta</option>
                            <option value="nome">Nome</option>
                        </select>
                    </div>
                </div>

                {/* Botões */}
                <div className="mt-3 space-y-2">
                    {buttons.map((btn, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                            <input
                                type="text"
                                className="flex-1 px-3 py-2 border border-gray-200 dark:border-[var(--border-color)] rounded-lg text-sm bg-white dark:bg-[var(--bg-glass)]"
                                placeholder="Digite @ p/ utilizar os campos"
                                value={btn.text}
                                onChange={(e) => updateButton(idx, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                            />
                            <span className="text-xs text-[#14b8a6]">CTR 0,0%</span>
                        </div>
                    ))}
                    {buttons.length < 3 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); addButton(); }}
                            className="w-full py-2 text-sm text-[#0f766e] hover:underline"
                        >
                            Novo botão
                        </button>
                    )}
                </div>

                {/* Timeout */}
                <div className="flex items-center gap-2 mt-3 text-sm">
                    <span className="text-gray-600 dark:text-[var(--text-muted)]">Se não responder em</span>
                    <select
                        className="w-16 bg-transparent border border-gray-200 dark:border-[var(--border-color)] rounded px-2 py-1"
                        value={timeoutSeconds}
                        onChange={(e) => setTimeoutSeconds(Number(e.target.value))}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {[0, 30, 60, 120, 300].map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                    <span className="text-gray-600 dark:text-[var(--text-muted)]">Segundos</span>
                </div>

                <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                    <span>Caso a resposta seja inválida</span>
                    <Icons.Help />
                </div>
            </div>

            <Handle type="target" position={Position.Left} className={`${nodeStyles.handle} !bg-[#0f766e]`} />
            {buttons.map((_, idx) => (
                <Handle
                    key={idx}
                    type="source"
                    position={Position.Right}
                    id={`button-${idx}`}
                    className={`${nodeStyles.handle}`}
                    style={{ top: `${50 + idx * 15}%`, backgroundColor: idx === 0 ? '#22c55e' : idx === 1 ? '#eab308' : '#ef4444' }}
                />
            ))}
            <Handle
                type="source"
                position={Position.Right}
                id="timeout"
                className={`${nodeStyles.handle} !bg-[#eab308]`}
                style={{ top: '75%' }}
            />
            <Handle
                type="source"
                position={Position.Right}
                id="invalid"
                className={`${nodeStyles.handle} !bg-[#ef4444]`}
                style={{ top: '90%' }}
            />

            <ButtonsTermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} onAccept={() => { }} />
        </div>
    );
}

// ============ NÓ DE COPIA E COLA ============
function ButtonsCopyNode({ data, selected, id }: CustomNodeProps) {
    const { updateConfig, deleteNode, duplicateNode } = useNodeConfig(id, data.config);
    const [message, setMessage] = useState(data.config?.message || '');
    const [code, setCode] = useState(data.config?.code || '');

    return (
        <div className={`group ${nodeStyles.wrapper} ${selected ? 'ring-2 ring-[var(--primary)] ring-offset-2' : ''}`}>
            <div className={nodeStyles.floatingButtons}>
                <button onClick={(e) => { e.stopPropagation(); duplicateNode(); }} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-gray-700">
                    <Icons.Duplicate /> Duplicar
                </button>
                <button onClick={(e) => { e.stopPropagation(); deleteNode(); }} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-red-600">
                    <Icons.Delete /> Remover
                </button>
            </div>

            <div className={nodeStyles.header} style={{ backgroundColor: '#0f766e' }}>
                <div className={nodeStyles.stats}>
                    <div>
                        <div className="text-2xl font-bold">{data.stats?.executing || 0}</div>
                        <div className="text-xs flex items-center gap-1">Executando <Icons.Help /></div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold">{data.stats?.sent || 0}</div>
                        <div className="text-xs flex items-center gap-1">Enviados <Icons.Help /></div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between px-4 py-2 bg-[#0f766e]">
                <div className="flex items-center gap-2 text-white">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">📋</div>
                    <div>
                        <div className="font-semibold text-sm">Enviar Copia e Cola</div>
                        <div className="text-xs opacity-80">Botões</div>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-white">
                    <button className="p-1 hover:bg-white/20 rounded"><Icons.Help /></button>
                    <button className="p-1 hover:bg-white/20 rounded"><Icons.Play /></button>
                </div>
            </div>

            <div className={nodeStyles.body}>
                <p className="text-xs text-gray-400 italic mb-2">Digite sua mensagem abaixo</p>

                <div className={nodeStyles.variableInput}>
                    <span>😊</span>
                    <input
                        type="text"
                        className="flex-1 bg-transparent border-none outline-none text-sm"
                        placeholder="Digite @ p/ utilizar os campos"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>

                <div className="flex items-center gap-2 mt-3">
                    <span className="text-sm text-gray-600 dark:text-[var(--text-muted)]">Código:</span>
                    <input
                        type="text"
                        className="flex-1 px-3 py-2 border border-gray-200 dark:border-[var(--border-color)] rounded-lg text-sm bg-white dark:bg-[var(--bg-glass)]"
                        placeholder="Digite @ p/ utilizar os campos"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>

                <div className={nodeStyles.nextStep}>
                    <span>Próximo passo</span>
                    <div className="w-3 h-3 rounded-full bg-[#0f766e] border-2 border-white shadow"></div>
                </div>
            </div>

            <Handle type="target" position={Position.Left} className={`${nodeStyles.handle} !bg-[#0f766e]`} />
            <Handle type="source" position={Position.Right} className={`${nodeStyles.handle} !bg-[#0f766e]`} />
        </div>
    );
}

// ============ NÓ DE BOTÕES AÇÕES ============
function ButtonsActionsNode({ data, selected, id }: CustomNodeProps) {
    const { updateConfig, deleteNode, duplicateNode } = useNodeConfig(id, data.config);
    const [title, setTitle] = useState(data.config?.title || '');
    const [message, setMessage] = useState(data.config?.message || '');
    const [footer, setFooter] = useState(data.config?.footer || '');
    const [buttons, setButtons] = useState<Array<{ type: string; title: string; url: string }>>(
        data.config?.buttons || [{ type: 'link', title: '', url: '' }]
    );

    const addButton = () => {
        if (buttons.length < 3) {
            setButtons([...buttons, { type: 'link', title: '', url: '' }]);
        }
    };

    const updateButton = (idx: number, field: string, value: string) => {
        const newButtons = [...buttons];
        (newButtons[idx] as any)[field] = value;
        setButtons(newButtons);
    };

    return (
        <div className={`group ${nodeStyles.wrapper} ${selected ? 'ring-2 ring-[var(--primary)] ring-offset-2' : ''}`}>
            <div className={nodeStyles.floatingButtons}>
                <button onClick={(e) => { e.stopPropagation(); duplicateNode(); }} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-gray-700">
                    <Icons.Duplicate /> Duplicar
                </button>
                <button onClick={(e) => { e.stopPropagation(); deleteNode(); }} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-red-600">
                    <Icons.Delete /> Remover
                </button>
            </div>

            <div className={nodeStyles.header} style={{ backgroundColor: '#0f766e' }}>
                <div className={nodeStyles.stats}>
                    <div>
                        <div className="text-2xl font-bold">{data.stats?.executing || 0}</div>
                        <div className="text-xs flex items-center gap-1">Executando <Icons.Help /></div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold">{data.stats?.sent || 0}</div>
                        <div className="text-xs flex items-center gap-1">Enviados <Icons.Help /></div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between px-4 py-2 bg-[#0f766e]">
                <div className="flex items-center gap-2 text-white">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">📋</div>
                    <div>
                        <div className="font-semibold text-sm">Enviar ações</div>
                        <div className="text-xs opacity-80">Botões</div>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-white">
                    <button className="p-1 hover:bg-white/20 rounded"><Icons.Help /></button>
                    <button className="p-1 hover:bg-white/20 rounded"><Icons.Play /></button>
                </div>
            </div>

            <div className={nodeStyles.body}>
                <p className="text-xs text-gray-400 italic mb-2">Digite sua mensagem abaixo</p>

                <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-[var(--border-color)] rounded-lg text-sm mb-2 bg-white dark:bg-[var(--bg-glass)]"
                    placeholder="Digite o título (Opcional)"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                />

                <div className={nodeStyles.variableInput}>
                    <span>😊</span>
                    <input
                        type="text"
                        className="flex-1 bg-transparent border-none outline-none text-sm"
                        placeholder="Digite @ p/ utilizar os campos"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>

                <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-[var(--border-color)] rounded-lg text-sm mt-2 bg-white dark:bg-[var(--bg-glass)]"
                    placeholder="Digite o rodapé (Opcional)"
                    value={footer}
                    onChange={(e) => setFooter(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                />

                {/* Botões de Ação */}
                <div className="mt-3 space-y-3 p-3 bg-gray-50 dark:bg-[var(--bg-glass)] rounded-lg">
                    {buttons.map((btn, idx) => (
                        <div key={idx} className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs text-gray-500">Tipo</label>
                                    <select
                                        className="w-full px-2 py-1 border border-gray-200 dark:border-[var(--border-color)] rounded text-sm bg-white dark:bg-[var(--bg-secondary)]"
                                        value={btn.type}
                                        onChange={(e) => updateButton(idx, 'type', e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <option value="link">Link</option>
                                        <option value="call">Ligar</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">Título</label>
                                    <input
                                        type="text"
                                        className="w-full px-2 py-1 border border-gray-200 dark:border-[var(--border-color)] rounded text-sm bg-white dark:bg-[var(--bg-secondary)]"
                                        value={btn.title}
                                        onChange={(e) => updateButton(idx, 'title', e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-[#0f766e]">Link(URL)</label>
                                <input
                                    type="url"
                                    className="w-full px-2 py-1 border border-gray-200 dark:border-[var(--border-color)] rounded text-sm bg-white dark:bg-[var(--bg-secondary)]"
                                    placeholder="Ex: https://www.dominio.com.br"
                                    value={btn.url}
                                    onChange={(e) => updateButton(idx, 'url', e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                        </div>
                    ))}
                    {buttons.length < 3 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); addButton(); }}
                            className="w-full py-2 text-sm text-[#0f766e] hover:underline"
                        >
                            Novo botão de ação
                        </button>
                    )}
                </div>

                <div className={nodeStyles.nextStep}>
                    <span>Próximo passo</span>
                    <div className="w-3 h-3 rounded-full bg-[#0f766e] border-2 border-white shadow"></div>
                </div>
            </div>

            <Handle type="target" position={Position.Left} className={`${nodeStyles.handle} !bg-[#0f766e]`} />
            <Handle type="source" position={Position.Right} className={`${nodeStyles.handle} !bg-[#0f766e]`} />
        </div>
    );
}

// ============ NÓ DE CHAMADA EXTERNA (WEBHOOK) ============
function WebhookNode({ data, selected, id }: CustomNodeProps) {
    const { updateConfig, deleteNode, duplicateNode } = useNodeConfig(id, data.config);

    return (
        <div className={`group ${nodeStyles.wrapper} ${selected ? 'ring-2 ring-[var(--primary)] ring-offset-2' : ''}`}>
            <div className={nodeStyles.floatingButtons}>
                <button onClick={(e) => { e.stopPropagation(); duplicateNode(); }} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-gray-700">
                    <Icons.Duplicate /> Duplicar
                </button>
                <button onClick={(e) => { e.stopPropagation(); deleteNode(); }} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-red-600">
                    <Icons.Delete /> Remover
                </button>
            </div>

            <div className={nodeStyles.header} style={{ backgroundColor: '#3b82f6' }}>
                <div className={nodeStyles.stats}>
                    <div>
                        <div className="text-2xl font-bold">{data.stats?.executing || 0}</div>
                        <div className="text-xs flex items-center gap-1">Executando <Icons.Help /></div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold">{data.stats?.sent || 0}</div>
                        <div className="text-xs flex items-center gap-1">Enviados <Icons.Help /></div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between px-4 py-2 bg-[#3b82f6]">
                <div className="flex items-center gap-2 text-white">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">🔌</div>
                    <div>
                        <div className="font-semibold text-sm">Chamada externa</div>
                        <div className="text-xs opacity-80">Integração</div>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-white">
                    <button className="p-1 hover:bg-white/20 rounded"><Icons.Help /></button>
                    <button className="p-1 hover:bg-white/20 rounded"><Icons.Play /></button>
                </div>
            </div>

            <div className={nodeStyles.body}>
                <button className="w-full py-3 text-[#3b82f6] hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg font-medium">
                    Configurar etapa do fluxo
                </button>
            </div>

            <Handle type="target" position={Position.Left} className={`${nodeStyles.handle} !bg-[#3b82f6]`} />
            <Handle type="source" position={Position.Right} className={`${nodeStyles.handle} !bg-[#3b82f6]`} />
        </div>
    );
}

// ============ COMPONENTE BASE PARA NÓS DE IA ============
interface AINodeProps {
    data: any;
    selected: boolean;
    id: string;
    title: string;
    icon: string;
    color: string;
    tokenPlaceholder: string;
    helpLink: string;
}

function AINodeBase({ data, selected, id, title, icon, color, tokenPlaceholder, helpLink }: AINodeProps) {
    const { updateConfig, deleteNode, duplicateNode } = useNodeConfig(id, data.config || {});
    const config = data.config || {};
    const [token, setToken] = useState(config?.token || '');
    const [prompt, setPrompt] = useState(config?.prompt || '');
    const [saved, setSaved] = useState(false);

    const handleSaveToken = () => {
        updateConfig({ token, prompt });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className={`group ${nodeStyles.wrapper} ${selected ? 'ring-2 ring-[var(--primary)] ring-offset-2' : ''}`}>
            <div className={nodeStyles.floatingButtons}>
                <button onClick={(e) => { e.stopPropagation(); duplicateNode(); }} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-gray-700">
                    <Icons.Duplicate /> Duplicar
                </button>
                <button onClick={(e) => { e.stopPropagation(); deleteNode(); }} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-red-600">
                    <Icons.Delete /> Remover
                </button>
            </div>

            <div className={nodeStyles.header} style={{ backgroundColor: color }}>
                <div className={nodeStyles.stats}>
                    <div>
                        <div className="text-2xl font-bold">{data.stats?.executing || 0}</div>
                        <div className="text-xs flex items-center gap-1">Executando <Icons.Help /></div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold">{data.stats?.sent || 0}</div>
                        <div className="text-xs flex items-center gap-1">Enviados <Icons.Help /></div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between px-4 py-2" style={{ backgroundColor: color }}>
                <div className="flex items-center gap-2 text-white">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-lg">{icon}</div>
                    <div>
                        <div className="font-semibold text-sm">{title}</div>
                        <div className="text-xs opacity-80">Inteligência artificial</div>
                    </div>
                </div>
                <button className="p-1 hover:bg-white/20 rounded text-white"><Icons.Play /></button>
            </div>

            <div className={nodeStyles.body}>
                <div className="mb-3">
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Token de Integração</label>
                    <input
                        type="password"
                        className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-[var(--bg-glass)] ${token ? 'border-green-400' : 'border-gray-200 dark:border-[var(--border-color)]'}`}
                        placeholder={tokenPlaceholder}
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        autoComplete="new-password"
                    />
                    <a
                        href={helpLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-xs text-[#14b8a6] hover:underline mt-1 text-right"
                        onClick={(e) => e.stopPropagation()}
                    >
                        Obter token
                    </a>
                </div>

                <div className="mb-4">
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Instruções do Robô (Prompt)</label>
                    <textarea
                        className="w-full px-3 py-2 border border-gray-200 dark:border-[var(--border-color)] rounded-lg text-sm bg-white dark:bg-[var(--bg-glass)] resize-none"
                        placeholder="Ex: Aja como um vendedor especialista..."
                        rows={3}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>

                <button
                    className={`w-full py-2 text-white rounded-lg font-medium transition-all ${saved ? 'bg-green-500' : ''}`}
                    style={{ backgroundColor: saved ? undefined : color }}
                    onClick={(e) => { e.stopPropagation(); handleSaveToken(); }}
                >
                    {saved ? '✓ Salvo!' : 'Salvar Configuração'}
                </button>
            </div>

            <Handle type="target" position={Position.Left} className={`${nodeStyles.handle}`} style={{ backgroundColor: color }} />
            <Handle type="source" position={Position.Right} className={`${nodeStyles.handle}`} style={{ backgroundColor: color }} />
        </div>
    );
}

// ============ NÓ CHATGPT ============
function ChatGPTNode({ data, selected, id }: CustomNodeProps) {
    return (
        <AINodeBase
            data={data}
            selected={selected}
            id={id}
            title="Chat GPT 4"
            icon="🧠"
            color="#38bdf8"
            tokenPlaceholder="Ex: sk-...kvKg"
            helpLink="https://platform.openai.com/api-keys"
        />
    );
}

// ============ NÓ GEMINI ============
function GeminiNode({ data, selected, id }: CustomNodeProps) {
    return (
        <AINodeBase
            data={data}
            selected={selected}
            id={id}
            title="Gemini (Google)"
            icon="✨"
            color="#4285f4"
            tokenPlaceholder="Ex: AIza..."
            helpLink="https://aistudio.google.com/apikey"
        />
    );
}

// ============ NÓ LLAMA ============
function LlamaNode({ data, selected, id }: CustomNodeProps) {
    return (
        <AINodeBase
            data={data}
            selected={selected}
            id={id}
            title="Llama (Meta)"
            icon="🦙"
            color="#0668e1"
            tokenPlaceholder="Ex: meta-..."
            helpLink="https://llama.meta.com/docs/getting-started/"
        />
    );
}

// ============ NÓ ANTHROPIC ============
function AnthropicNode({ data, selected, id }: CustomNodeProps) {
    return (
        <AINodeBase
            data={data}
            selected={selected}
            id={id}
            title="Claude (Anthropic)"
            icon="🧠"
            color="#cc785c"
            tokenPlaceholder="Ex: sk-ant-..."
            helpLink="https://console.anthropic.com/account/keys"
        />
    );
}

// ============ NÓ GROQ ============
function GroqNode({ data, selected, id }: CustomNodeProps) {
    return (
        <AINodeBase
            data={data}
            selected={selected}
            id={id}
            title="Groq (LPU)"
            icon="⚡"
            color="#f55036"
            tokenPlaceholder="Ex: gsk_..."
            helpLink="https://console.groq.com/keys"
        />
    );
}

// ============ NÓ CUSTOM LLM ============
function CustomLLMNode({ data, selected, id }: CustomNodeProps) {
    const { updateConfig, deleteNode, duplicateNode } = useNodeConfig(id, data.config);
    const [apiUrl, setApiUrl] = useState(data.config?.apiUrl || '');
    const [apiKey, setApiKey] = useState(data.config?.apiKey || '');
    const [model, setModel] = useState(data.config?.model || '');
    const [systemPrompt, setSystemPrompt] = useState(data.config?.systemPrompt || '');

    // Sincronizar mudanças automaticamente (debounced)
    useEffect(() => {
        const timeout = setTimeout(() => {
            updateConfig({ apiUrl, apiKey, model, systemPrompt });
        }, 500);
        return () => clearTimeout(timeout);
    }, [apiUrl, apiKey, model, systemPrompt, updateConfig]);

    return (
        <div className={`group ${nodeStyles.wrapper} ${selected ? 'ring-2 ring-[var(--primary)] ring-offset-2' : ''}`}>
            <div className={nodeStyles.floatingButtons}>
                <button onClick={(e) => { e.stopPropagation(); duplicateNode(); }} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-gray-700">
                    <Icons.Duplicate /> Duplicar
                </button>
                <button onClick={(e) => { e.stopPropagation(); deleteNode(); }} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-red-600">
                    <Icons.Delete /> Remover
                </button>
            </div>

            <div className={nodeStyles.header} style={{ backgroundColor: '#6366f1' }}>
                <div className={nodeStyles.stats}>
                    <div>
                        <div className="text-2xl font-bold">{data.stats?.executing || 0}</div>
                        <div className="text-xs flex items-center gap-1">Executando <Icons.Help /></div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold">{data.stats?.sent || 0}</div>
                        <div className="text-xs flex items-center gap-1">Enviados <Icons.Help /></div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between px-4 py-2 bg-[#6366f1]">
                <div className="flex items-center gap-2 text-white">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-lg">🔧</div>
                    <div>
                        <div className="font-semibold text-sm">LLM Customizada</div>
                        <div className="text-xs opacity-80">Configurar API</div>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-white">
                    <button className="p-1 hover:bg-white/20 rounded"><Icons.Help /></button>
                    <button className="p-1 hover:bg-white/20 rounded"><Icons.Play /></button>
                </div>
            </div>

            <div className={nodeStyles.body}>
                <div className="space-y-3">
                    <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">URL da API *</label>
                        <input
                            type="url"
                            className="w-full px-3 py-2 border border-gray-200 dark:border-[var(--border-color)] rounded-lg text-sm bg-white dark:bg-[var(--bg-glass)]"
                            placeholder="https://api.exemplo.com/v1/chat"
                            value={apiUrl}
                            onChange={(e) => setApiUrl(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>

                    <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">API Key *</label>
                        <input
                            type="password"
                            className="w-full px-3 py-2 border border-gray-200 dark:border-[var(--border-color)] rounded-lg text-sm bg-white dark:bg-[var(--bg-glass)]"
                            placeholder="Ex: sk-..."
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            autoComplete="new-password"
                        />
                    </div>

                    <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Modelo</label>
                        <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-200 dark:border-[var(--border-color)] rounded-lg text-sm bg-white dark:bg-[var(--bg-glass)]"
                            placeholder="Ex: gpt-4, llama-3, mistral"
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>

                    <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Prompt do Sistema (opcional)</label>
                        <textarea
                            className="w-full px-3 py-2 border border-gray-200 dark:border-[var(--border-color)] rounded-lg text-sm bg-white dark:bg-[var(--bg-glass)] resize-none"
                            placeholder="Instruções para a IA..."
                            rows={2}
                            value={systemPrompt}
                            onChange={(e) => setSystemPrompt(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>

                    <button
                        className="w-full py-2 bg-[#6366f1] text-white rounded-lg font-medium hover:bg-[#4f46e5] transition-colors"
                        onClick={(e) => e.stopPropagation()}
                    >
                        Testar Conexão
                    </button>
                </div>

                <div className={nodeStyles.nextStep}>
                    <span>Próximo passo</span>
                    <div className="w-3 h-3 rounded-full bg-[#6366f1] border-2 border-white shadow"></div>
                </div>
            </div>

            <Handle type="target" position={Position.Left} className={`${nodeStyles.handle} !bg-[#6366f1]`} />
            <Handle type="source" position={Position.Right} className={`${nodeStyles.handle} !bg-[#6366f1]`} />
        </div>
    );
}

// ============ NÓ DE SMS ============
function SMSNode({ data, selected, id }: CustomNodeProps) {
    const { updateConfig, deleteNode, duplicateNode } = useNodeConfig(id, data.config || {});
    const [message, setMessage] = useState(data.config?.message || '');
    const [phoneNumber, setPhoneNumber] = useState(data.config?.phoneNumber || '');
    const maxChars = 160;

    // Sincronizar mudanças automaticamente (debounced)
    useEffect(() => {
        const timeout = setTimeout(() => {
            updateConfig({ message, phoneNumber });
        }, 500);
        return () => clearTimeout(timeout);
    }, [message, phoneNumber, updateConfig]);

    return (
        <div className={`group ${nodeStyles.wrapper} ${selected ? 'ring-2 ring-[var(--primary)] ring-offset-2' : ''}`}>
            <div className={nodeStyles.floatingButtons}>
                <button onClick={(e) => { e.stopPropagation(); duplicateNode(); }} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-gray-700">
                    <Icons.Duplicate /> Duplicar
                </button>
                <button onClick={(e) => { e.stopPropagation(); deleteNode(); }} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-red-600">
                    <Icons.Delete /> Remover
                </button>
            </div>

            <div className={nodeStyles.header} style={{ backgroundColor: '#22C55E' }}>
                <div className={nodeStyles.stats}>
                    <div>
                        <div className="text-2xl font-bold">{data.stats?.executing || 0}</div>
                        <div className="text-xs flex items-center gap-1">Executando <Icons.Help /></div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold">{data.stats?.sent || 0}</div>
                        <div className="text-xs flex items-center gap-1">Enviados <Icons.Help /></div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between px-4 py-2 bg-[#22C55E]">
                <div className="flex items-center gap-2 text-white">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">📲</div>
                    <div>
                        <div className="font-semibold text-sm">Enviar SMS</div>
                        <div className="text-xs opacity-80">Mensagem de texto</div>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-white">
                    <button className="p-1 hover:bg-white/20 rounded"><Icons.Help /></button>
                    <button className="p-1 hover:bg-white/20 rounded"><Icons.Play /></button>
                </div>
            </div>

            <div className={nodeStyles.body}>
                <div className="mb-3">
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Número de telefone</label>
                    <input
                        type="tel"
                        className="w-full px-3 py-2 border border-gray-200 dark:border-[var(--border-color)] rounded-lg text-sm bg-white dark:bg-[var(--bg-glass)]"
                        placeholder="+55 11 99999-9999 ou @variavel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>

                <div className="mb-3">
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Mensagem ({message.length}/{maxChars})</label>
                    <textarea
                        className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-[var(--bg-glass)] resize-none ${message.length > maxChars ? 'border-red-400' : 'border-gray-200 dark:border-[var(--border-color)]'
                            }`}
                        placeholder="Digite sua mensagem SMS..."
                        rows={3}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                    />
                    {message.length > maxChars && (
                        <p className="text-xs text-red-500 mt-1">⚠️ SMS será dividido em {Math.ceil(message.length / maxChars)} partes</p>
                    )}
                </div>

                <div className={nodeStyles.nextStep}>
                    <span>Próximo passo</span>
                    <div className="w-3 h-3 rounded-full bg-[#22C55E] border-2 border-white shadow"></div>
                </div>
            </div>

            <Handle type="target" position={Position.Left} className={`${nodeStyles.handle} !bg-[#22C55E]`} />
            <Handle type="source" position={Position.Right} className={`${nodeStyles.handle} !bg-[#22C55E]`} />
        </div>
    );
}

// ============ NÓ DE EMAIL ============
function EmailNode({ data, selected, id }: CustomNodeProps) {
    const { updateConfig, deleteNode, duplicateNode } = useNodeConfig(id, data.config || {});
    const [to, setTo] = useState(data.config?.to || '');
    const [subject, setSubject] = useState(data.config?.subject || '');
    const [body, setBody] = useState(data.config?.body || '');
    const [cc, setCc] = useState(data.config?.cc || '');
    const [bcc, setBcc] = useState(data.config?.bcc || '');
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Sincronizar mudanças automaticamente (debounced)
    useEffect(() => {
        const timeout = setTimeout(() => {
            updateConfig({ to, subject, body, cc, bcc });
        }, 500);
        return () => clearTimeout(timeout);
    }, [to, subject, body, cc, bcc, updateConfig]);

    return (
        <div className={`group ${nodeStyles.wrapper} ${selected ? 'ring-2 ring-[var(--primary)] ring-offset-2' : ''}`}>
            <div className={nodeStyles.floatingButtons}>
                <button onClick={(e) => { e.stopPropagation(); duplicateNode(); }} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-gray-700">
                    <Icons.Duplicate /> Duplicar
                </button>
                <button onClick={(e) => { e.stopPropagation(); deleteNode(); }} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-red-600">
                    <Icons.Delete /> Remover
                </button>
            </div>

            <div className={nodeStyles.header} style={{ backgroundColor: '#EA4335' }}>
                <div className={nodeStyles.stats}>
                    <div>
                        <div className="text-2xl font-bold">{data.stats?.executing || 0}</div>
                        <div className="text-xs flex items-center gap-1">Executando <Icons.Help /></div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold">{data.stats?.sent || 0}</div>
                        <div className="text-xs flex items-center gap-1">Enviados <Icons.Help /></div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between px-4 py-2 bg-[#EA4335]">
                <div className="flex items-center gap-2 text-white">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">📧</div>
                    <div>
                        <div className="font-semibold text-sm">Enviar Email</div>
                        <div className="text-xs opacity-80">Correio eletrônico</div>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-white">
                    <button className="p-1 hover:bg-white/20 rounded"><Icons.Help /></button>
                    <button className="p-1 hover:bg-white/20 rounded"><Icons.Play /></button>
                </div>
            </div>

            <div className={nodeStyles.body}>
                <div className="space-y-3">
                    <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Para (destinatário) *</label>
                        <input
                            type="email"
                            className="w-full px-3 py-2 border border-gray-200 dark:border-[var(--border-color)] rounded-lg text-sm bg-white dark:bg-[var(--bg-glass)]"
                            placeholder="email@exemplo.com ou @variavel"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>

                    <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Assunto *</label>
                        <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-200 dark:border-[var(--border-color)] rounded-lg text-sm bg-white dark:bg-[var(--bg-glass)]"
                            placeholder="Assunto do email"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>

                    <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Corpo do email (HTML)</label>
                        <textarea
                            className="w-full px-3 py-2 border border-gray-200 dark:border-[var(--border-color)] rounded-lg text-sm bg-white dark:bg-[var(--bg-glass)] resize-none font-mono"
                            placeholder="<p>Olá @nome,</p><p>Sua mensagem aqui...</p>"
                            rows={4}
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowAdvanced(!showAdvanced);
                        }}
                        className="text-sm text-[#EA4335] hover:underline"
                    >
                        {showAdvanced ? '▼ Ocultar opções avançadas' : '▶ Mostrar opções avançadas'}
                    </button>

                    {showAdvanced && (
                        <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-[var(--border-color)]">
                            <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">CC (cópia)</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-200 dark:border-[var(--border-color)] rounded-lg text-sm bg-white dark:bg-[var(--bg-glass)]"
                                    placeholder="email1@ex.com, email2@ex.com"
                                    value={cc}
                                    onChange={(e) => setCc(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">BCC (cópia oculta)</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-200 dark:border-[var(--border-color)] rounded-lg text-sm bg-white dark:bg-[var(--bg-glass)]"
                                    placeholder="email@ex.com"
                                    value={bcc}
                                    onChange={(e) => setBcc(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Anexos</label>
                                <div className="border-2 border-dashed border-gray-200 dark:border-[var(--border-color)] rounded-lg p-4 text-center text-sm text-gray-400">
                                    📎 Clique para adicionar anexos
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className={`${nodeStyles.nextStep} mt-4`}>
                    <span>Próximo passo</span>
                    <div className="w-3 h-3 rounded-full bg-[#EA4335] border-2 border-white shadow"></div>
                </div>
            </div>

            <Handle type="target" position={Position.Left} className={`${nodeStyles.handle} !bg-[#EA4335]`} />
            <Handle type="source" position={Position.Right} className={`${nodeStyles.handle} !bg-[#EA4335]`} />
        </div>
    );
}

// ============ NÓ DE DELAY ============
function DelayNode({ data, selected, id }: CustomNodeProps) {
    const { updateConfig, deleteNode, duplicateNode } = useNodeConfig(id, data.config);
    const [seconds, setSeconds] = useState(data.config?.seconds || 5);

    return (
        <div className={`group ${nodeStyles.wrapper} min-w-[200px] ${selected ? 'ring-2 ring-[var(--primary)] ring-offset-2' : ''}`}>
            <div className={nodeStyles.floatingButtons}>
                <button onClick={(e) => { e.stopPropagation(); duplicateNode(); }} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-gray-700">
                    <Icons.Duplicate /> Duplicar
                </button>
                <button onClick={(e) => { e.stopPropagation(); deleteNode(); }} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-red-600">
                    <Icons.Delete /> Remover
                </button>
            </div>

            <div className="px-4 py-3 rounded-t-xl bg-[#f59e0b] text-white">
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">⏱️</span>
                        <div className="font-semibold">Aguardar (Delay)</div>
                    </div>
                </div>
                <div className="flex justify-between text-center text-white/90 text-xs">
                    <div>
                        <div className="font-bold text-lg">{data.stats?.executing || 0}</div>
                        <div>Aguardando</div>
                    </div>
                    <div>
                        <div className="font-bold text-lg">{data.stats?.sent || 0}</div>
                        <div>Concluídos</div>
                    </div>
                </div>
            </div>

            <div className={nodeStyles.body}>
                <div className="flex items-center gap-2 justify-center">
                    <span>Aguardar</span>
                    <input
                        type="number"
                        className="w-20 bg-gray-50 dark:bg-[var(--bg-secondary)] border border-gray-200 dark:border-[var(--border-color)] rounded px-2 py-1 text-center"
                        value={seconds}
                        onChange={(e) => {
                            const val = Number(e.target.value);
                            setSeconds(val);
                            updateConfig({ seconds: val });
                        }}
                        onClick={(e) => e.stopPropagation()}
                    />
                    <span>segundos</span>
                </div>

                <div className={nodeStyles.nextStep}>
                    <span>Próximo passo</span>
                    <div className="w-3 h-3 rounded-full bg-[#f59e0b] border-2 border-white shadow"></div>
                </div>
            </div>

            <Handle type="target" position={Position.Left} className={`${nodeStyles.handle} !bg-gray-400`} />
            <Handle type="source" position={Position.Right} className={`${nodeStyles.handle} !bg-[#f59e0b]`} />
        </div>
    );
}

// ============ NÓ DE CONDIÇÃO ============
function ConditionNode({ data, selected, id }: CustomNodeProps) {
    const { updateConfig, deleteNode } = useNodeConfig(id, data.config);
    const [field, setField] = useState(data.config?.field || '');
    const [operator, setOperator] = useState(data.config?.operator || 'contains');
    const [value, setValue] = useState(data.config?.value || '');

    return (
        <div className={`group ${nodeStyles.wrapper} min-w-[220px] ${selected ? 'ring-2 ring-[var(--primary)] ring-offset-2' : ''}`}>
            <div className={nodeStyles.floatingButtons}>
                <button onClick={deleteNode} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-red-600">
                    <Icons.Delete /> Remover
                </button>
            </div>

            <div className="px-4 py-3 rounded-t-xl bg-[#f97316] text-white">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">🔀</span>
                    <div>
                        <div className="font-semibold text-sm">Condição</div>
                        <div className="text-[10px] opacity-80">Desvio de fluxo</div>
                    </div>
                </div>
            </div>

            <div className={nodeStyles.body}>
                <div className="space-y-3">
                    <div>
                        <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Campo / Variável</label>
                        <input 
                            type="text"
                            placeholder="Ex: last_message, nome"
                            className="w-full bg-transparent border border-gray-200 dark:border-[var(--border-color)] rounded px-2 py-1.5 text-sm"
                            value={field}
                            onChange={(e) => { setField(e.target.value); updateConfig({ field: e.target.value }); }}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>

                    <div>
                        <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Operador</label>
                        <select 
                            className="w-full bg-transparent border border-gray-200 dark:border-[var(--border-color)] rounded px-2 py-1.5 text-sm"
                            value={operator}
                            onChange={(e) => { setOperator(e.target.value); updateConfig({ operator: e.target.value }); }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <option value="contains">Contém</option>
                            <option value="equals">Igual a</option>
                            <option value="not_equals">Diferente de</option>
                            <option value="starts_with">Começa com</option>
                            <option value="exists">Existe / Definido</option>
                        </select>
                    </div>

                    {operator !== 'exists' && (
                        <div>
                            <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Valor</label>
                            <input 
                                type="text"
                                placeholder="Valor para comparar"
                                className="w-full bg-transparent border border-gray-200 dark:border-[var(--border-color)] rounded px-2 py-1.5 text-sm"
                                value={value}
                                onChange={(e) => { setValue(e.target.value); updateConfig({ value: e.target.value }); }}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-2 mt-4">
                    <div className="flex items-center justify-between text-xs p-2 bg-green-50 dark:bg-green-900/10 rounded-lg">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-[#22c55e]"></div>
                            <span className="font-medium text-green-700 dark:text-green-400">Verdadeiro</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between text-xs p-2 bg-red-50 dark:bg-red-900/10 rounded-lg">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-[#ef4444]"></div>
                            <span className="font-medium text-red-700 dark:text-red-400">Falso</span>
                        </div>
                    </div>
                </div>
            </div>

            <Handle type="target" position={Position.Left} className={`${nodeStyles.handle} !bg-gray-400`} />
            <Handle type="source" position={Position.Right} id="yes" className={`${nodeStyles.handle} !bg-[#22c55e]`} style={{ top: '65%' }} />
            <Handle type="source" position={Position.Right} id="no" className={`${nodeStyles.handle} !bg-[#ef4444]`} style={{ top: '85%' }} />
        </div>
    );
}

// ============ NÓ FIM ============
function EndNode({ data, selected }: CustomNodeProps) {
    return (
        <div className={`group ${nodeStyles.wrapper} min-w-[150px] ${selected ? 'ring-2 ring-[var(--primary)] ring-offset-2' : ''}`}>
            <div className="px-6 py-4 rounded-xl bg-gradient-to-r from-[#ef4444] to-[#dc2626] text-white text-center">
                <span className="text-2xl">🏁</span>
                <div className="font-bold">Fim do Fluxo</div>
            </div>
            <Handle type="target" position={Position.Left} className={`${nodeStyles.handle} !bg-[#ef4444]`} />
        </div>
    );
}

// ============ NÓ TEMPLATE DE TEXTO ============
function TemplateTextNode({ data, selected, id }: CustomNodeProps) {
    const { updateConfig, deleteNode, duplicateNode } = useNodeConfig(id, data.config);
    const [selectedTemplate, setSelectedTemplate] = useState<string>(data.config?.templateName || '');
    const [templates, setTemplates] = useState<MetaTemplate[]>([]);
    const [accounts, setAccounts] = useState<WabaAccount[]>([]);
    const [selectedAccount, setSelectedAccount] = useState<string>(data.config?.accountId || '');
    const [loading, setLoading] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Carregar contas WABA
    useEffect(() => {
        const loadAccounts = async () => {
            try {
                const data = await metaTemplatesService.listAccounts();
                setAccounts(data);
                if (data.length > 0 && !selectedAccount) {
                    setSelectedAccount(data[0].id);
                }
            } catch (error) {
                console.error('Erro ao carregar contas:', error);
            }
        };
        loadAccounts();
    }, []);

    // Carregar templates quando conta mudar
    useEffect(() => {
        if (!selectedAccount) return;
        const loadTemplates = async () => {
            setLoading(true);
            try {
                const data = await metaTemplatesService.listTemplates(selectedAccount);
                // Filtrar apenas templates de texto (sem botões)
                const textTemplates = data.filter(t =>
                    !t.components.some((c: any) => c.type === 'BUTTONS')
                );
                setTemplates(textTemplates);
            } catch (error) {
                console.error('Erro ao carregar templates:', error);
            } finally {
                setLoading(false);
            }
        };
        loadTemplates();
    }, [selectedAccount]);

    const currentTemplate = templates.find(t => t.name === selectedTemplate);

    return (
        <div className={`group ${nodeStyles.wrapper} ${selected ? 'ring-2 ring-[var(--primary)] ring-offset-2' : ''}`}>
            {/* Floating Buttons */}
            <div className={nodeStyles.floatingButtons}>
                <button onClick={(e) => { e.stopPropagation(); duplicateNode(); }} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-gray-700">
                    <Icons.Duplicate /> Duplicar
                </button>
                <button onClick={(e) => { e.stopPropagation(); deleteNode(); }} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-red-600">
                    <Icons.Delete /> Remover
                </button>
            </div>

            {/* Header */}
            <div className={nodeStyles.header} style={{ backgroundColor: '#8b5cf6' }}>
                <div className={nodeStyles.stats}>
                    <div>
                        <div className="text-2xl font-bold">{data.stats?.executing || 0}</div>
                        <div className="text-xs flex items-center gap-1">Executando <Icons.Help /></div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold">{data.stats?.sent || 0}</div>
                        <div className="text-xs flex items-center gap-1">Enviados <Icons.Help /></div>
                    </div>
                </div>
            </div>

            {/* Title Bar */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#8b5cf6]">
                <div className="flex items-center gap-2 text-white">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                        📝
                    </div>
                    <div>
                        <div className="font-semibold text-sm">Template de texto</div>
                        <div className="text-xs opacity-80">Meta WhatsApp</div>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-white">
                    <button className="p-1 hover:bg-white/20 rounded"><Icons.Help /></button>
                    <button className="p-1 hover:bg-white/20 rounded"><Icons.Play /></button>
                </div>
            </div>

            {/* Body */}
            <div className={nodeStyles.body}>
                {/* Seletor de Conta WABA */}
                <div className="mb-3">
                    <label className="text-xs text-gray-400 mb-1 block">Conta WABA</label>
                    <select
                        className="w-full bg-transparent border border-gray-200 dark:border-[var(--border-color)] rounded px-2 py-2 text-sm"
                        value={selectedAccount}
                        onChange={(e) => setSelectedAccount(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {accounts.length === 0 && <option value="">Configurar em Templates Meta →</option>}
                        {accounts.map(acc => (
                            <option key={acc.id} value={acc.id}>{acc.name} ({acc.phoneNumber})</option>
                        ))}
                    </select>
                </div>

                {/* Seletor de Template */}
                <div className="mb-3">
                    <label className="text-xs text-gray-400 mb-1 block">Template</label>
                    <select
                        className="w-full bg-transparent border border-gray-200 dark:border-[var(--border-color)] rounded px-2 py-2 text-sm"
                        value={selectedTemplate}
                        onChange={(e) => setSelectedTemplate(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        disabled={loading || templates.length === 0}
                    >
                        <option value="">{loading ? 'Carregando...' : 'Selecione um template'}</option>
                        {templates.map(t => (
                            <option key={t.name} value={t.name}>
                                {t.name} ({getTemplateStatusLabel(t.status)})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Preview do Template */}
                {currentTemplate && (
                    <div className="bg-gray-50 dark:bg-[var(--bg-glass)] rounded-lg p-3 mb-3">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium">Preview</span>
                            <span
                                className="text-xs px-2 py-0.5 rounded-full text-white"
                                style={{ backgroundColor: getTemplateStatusColor(currentTemplate.status) }}
                            >
                                {getTemplateStatusLabel(currentTemplate.status)}
                            </span>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                            {currentTemplate.components.find((c: any) => c.type === 'BODY')?.text || 'Sem conteúdo'}
                        </div>
                    </div>
                )}

                {/* Botão Criar Novo Template */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowCreateModal(true);
                    }}
                    className="w-full py-2 text-sm text-[#8b5cf6] border border-dashed border-[#8b5cf6] rounded-lg hover:bg-[#8b5cf6]/10 transition-colors"
                >
                    + Criar novo template
                </button>

                <div className={nodeStyles.nextStep}>
                    <span>Próximo passo</span>
                    <div className="w-3 h-3 rounded-full bg-[#8b5cf6] border-2 border-white shadow"></div>
                </div>
            </div>

            {/* Handles */}
            <Handle
                type="target"
                position={Position.Left}
                className={`${nodeStyles.handle} !bg-[#8b5cf6]`}
            />
            <Handle
                type="source"
                position={Position.Right}
                className={`${nodeStyles.handle} !bg-[#8b5cf6]`}
            />

            {/* Modal Criar Template */}
            <CreateTemplateModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                accountId={selectedAccount}
                onSuccess={(templateName) => {
                    setSelectedTemplate(templateName);
                    // Recarregar templates
                    if (selectedAccount) {
                        metaTemplatesService.listTemplates(selectedAccount).then(data => {
                            const textTemplates = data.filter(t =>
                                !t.components.some((c: any) => c.type === 'BUTTONS')
                            );
                            setTemplates(textTemplates);
                        });
                    }
                }}
                withButtons={false}
            />
        </div>
    );
}

// ============ NÓ TEMPLATE COM BOTÃO ============
function TemplateButtonNode({ data, selected, id }: CustomNodeProps) {
    const { updateConfig, deleteNode, duplicateNode } = useNodeConfig(id, data.config);
    const [selectedTemplate, setSelectedTemplate] = useState<string>(data.config?.templateName || '');
    const [templates, setTemplates] = useState<MetaTemplate[]>([]);
    const [accounts, setAccounts] = useState<WabaAccount[]>([]);
    const [selectedAccount, setSelectedAccount] = useState<string>(data.config?.accountId || '');
    const [loading, setLoading] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Carregar contas WABA
    useEffect(() => {
        const loadAccounts = async () => {
            try {
                const data = await metaTemplatesService.listAccounts();
                setAccounts(data);
                if (data.length > 0 && !selectedAccount) {
                    setSelectedAccount(data[0].id);
                }
            } catch (error) {
                console.error('Erro ao carregar contas:', error);
            }
        };
        loadAccounts();
    }, []);

    // Carregar templates quando conta mudar
    useEffect(() => {
        if (!selectedAccount) return;
        const loadTemplates = async () => {
            setLoading(true);
            try {
                const data = await metaTemplatesService.listTemplates(selectedAccount);
                // Filtrar apenas templates com botões
                const buttonTemplates = data.filter(t =>
                    t.components.some((c: any) => c.type === 'BUTTONS')
                );
                setTemplates(buttonTemplates);
            } catch (error) {
                console.error('Erro ao carregar templates:', error);
            } finally {
                setLoading(false);
            }
        };
        loadTemplates();
    }, [selectedAccount]);

    const currentTemplate = templates.find(t => t.name === selectedTemplate);
    const buttons = currentTemplate?.components.find((c: any) => c.type === 'BUTTONS')?.buttons || [];

    return (
        <div className={`group ${nodeStyles.wrapper} ${selected ? 'ring-2 ring-[var(--primary)] ring-offset-2' : ''}`}>
            {/* Floating Buttons */}
            <div className={nodeStyles.floatingButtons}>
                <button onClick={(e) => { e.stopPropagation(); duplicateNode(); }} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-gray-700">
                    <Icons.Duplicate /> Duplicar
                </button>
                <button onClick={(e) => { e.stopPropagation(); deleteNode(); }} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-red-600">
                    <Icons.Delete /> Remover
                </button>
            </div>

            {/* Header */}
            <div className={nodeStyles.header} style={{ backgroundColor: '#8b5cf6' }}>
                <div className={nodeStyles.stats}>
                    <div>
                        <div className="text-2xl font-bold">{data.stats?.executing || 0}</div>
                        <div className="text-xs flex items-center gap-1">Executando <Icons.Help /></div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold">{data.stats?.sent || 0}</div>
                        <div className="text-xs flex items-center gap-1">Enviados <Icons.Help /></div>
                    </div>
                </div>
            </div>

            {/* Title Bar */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#8b5cf6]">
                <div className="flex items-center gap-2 text-white">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                        🔘
                    </div>
                    <div>
                        <div className="font-semibold text-sm">Template com botão</div>
                        <div className="text-xs opacity-80">Meta WhatsApp</div>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-white">
                    <button className="p-1 hover:bg-white/20 rounded"><Icons.Help /></button>
                    <button className="p-1 hover:bg-white/20 rounded"><Icons.Play /></button>
                </div>
            </div>

            {/* Body */}
            <div className={nodeStyles.body}>
                {/* Seletor de Conta WABA */}
                <div className="mb-3">
                    <label className="text-xs text-gray-400 mb-1 block">Conta WABA</label>
                    <select
                        className="w-full bg-transparent border border-gray-200 dark:border-[var(--border-color)] rounded px-2 py-2 text-sm"
                        value={selectedAccount}
                        onChange={(e) => setSelectedAccount(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {accounts.length === 0 && <option value="">Configurar em Templates Meta →</option>}
                        {accounts.map(acc => (
                            <option key={acc.id} value={acc.id}>{acc.name} ({acc.phoneNumber})</option>
                        ))}
                    </select>
                </div>

                {/* Seletor de Template */}
                <div className="mb-3">
                    <label className="text-xs text-gray-400 mb-1 block">Template</label>
                    <select
                        className="w-full bg-transparent border border-gray-200 dark:border-[var(--border-color)] rounded px-2 py-2 text-sm"
                        value={selectedTemplate}
                        onChange={(e) => setSelectedTemplate(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        disabled={loading || templates.length === 0}
                    >
                        <option value="">{loading ? 'Carregando...' : 'Selecione um template'}</option>
                        {templates.map(t => (
                            <option key={t.name} value={t.name}>
                                {t.name} ({getTemplateStatusLabel(t.status)})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Preview do Template */}
                {currentTemplate && (
                    <div className="bg-gray-50 dark:bg-[var(--bg-glass)] rounded-lg p-3 mb-3">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium">Preview</span>
                            <span
                                className="text-xs px-2 py-0.5 rounded-full text-white"
                                style={{ backgroundColor: getTemplateStatusColor(currentTemplate.status) }}
                            >
                                {getTemplateStatusLabel(currentTemplate.status)}
                            </span>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                            {currentTemplate.components.find((c: any) => c.type === 'BODY')?.text || 'Sem conteúdo'}
                        </div>
                        {/* Botões do Template */}
                        <div className="space-y-1">
                            {buttons.map((btn: any, idx: number) => (
                                <div
                                    key={idx}
                                    className="text-xs px-3 py-1.5 bg-[#8b5cf6]/20 text-[#8b5cf6] rounded text-center"
                                >
                                    {btn.text}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Botão Criar Novo Template */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowCreateModal(true);
                    }}
                    className="w-full py-2 text-sm text-[#8b5cf6] border border-dashed border-[#8b5cf6] rounded-lg hover:bg-[#8b5cf6]/10 transition-colors"
                >
                    + Criar novo template
                </button>

                <div className={nodeStyles.nextStep}>
                    <span>Próximo passo</span>
                    <div className="w-3 h-3 rounded-full bg-[#8b5cf6] border-2 border-white shadow"></div>
                </div>
            </div>

            {/* Handles */}
            <Handle
                type="target"
                position={Position.Left}
                className={`${nodeStyles.handle} !bg-[#8b5cf6]`}
            />
            {/* Handle para cada botão */}
            {buttons.length > 0 ? (
                buttons.map((btn: any, idx: number) => (
                    <Handle
                        key={idx}
                        type="source"
                        position={Position.Right}
                        id={`button-${idx}`}
                        className={`${nodeStyles.handle} !bg-[#8b5cf6]`}
                        style={{ top: `${60 + idx * 15}%` }}
                    />
                ))
            ) : (
                <Handle
                    type="source"
                    position={Position.Right}
                    className={`${nodeStyles.handle} !bg-[#8b5cf6]`}
                />
            )}

            {/* Modal Criar Template */}
            <CreateTemplateModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                accountId={selectedAccount}
                onSuccess={(templateName) => {
                    setSelectedTemplate(templateName);
                    // Recarregar templates
                    if (selectedAccount) {
                        metaTemplatesService.listTemplates(selectedAccount).then(data => {
                            const buttonTemplates = data.filter(t =>
                                t.components.some((c: any) => c.type === 'BUTTONS')
                            );
                            setTemplates(buttonTemplates);
                        });
                    }
                }}
                withButtons={true}
            />
        </div>
    );
}

// ============ NÓ DE LIMITAR EXECUÇÃO ============
function LimitExecutionNode({ data, selected, id }: CustomNodeProps) {
    const { updateConfig, deleteNode, duplicateNode } = useNodeConfig(id, data.config);
    const [maxExecutions, setMaxExecutions] = useState(data.config?.maxExecutions || 1);
    const [period, setPeriod] = useState(data.config?.period || 'day');

    const handleMaxExecutionsChange = (value: number) => {
        setMaxExecutions(value);
        updateConfig({ maxExecutions: value });
    };

    const handlePeriodChange = (value: string) => {
        setPeriod(value);
        updateConfig({ period: value });
    };

    return (
        <div className={`group ${nodeStyles.wrapper} ${selected ? 'ring-2 ring-[var(--primary)] ring-offset-2' : ''}`}>
            <div className={nodeStyles.floatingButtons}>
                <button onClick={duplicateNode} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-gray-700">
                    <Icons.Duplicate /> Duplicar
                </button>
                <button onClick={deleteNode} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-red-600">
                    <Icons.Delete /> Remover
                </button>
            </div>

            <div className={nodeStyles.header} style={{ backgroundColor: '#ef4444' }}>
                <div className={nodeStyles.stats}>
                    <div>
                        <div className="text-2xl font-bold">0</div>
                        <div className="text-xs flex items-center gap-1">Bloqueados <Icons.Help /></div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between px-4 py-2 bg-[#ef4444]">
                <div className="flex items-center gap-2 text-white">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">🚫</div>
                    <div>
                        <div className="font-semibold text-sm">Limitar execução</div>
                        <div className="text-xs opacity-80">Controle de frequência</div>
                    </div>
                </div>
            </div>

            <div className={nodeStyles.body}>
                <p className="text-xs text-gray-400 mb-3">Limite quantas vezes o contato pode executar este fluxo</p>

                <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm">Máximo</span>
                    <input
                        type="number"
                        min={1}
                        max={100}
                        className="w-16 px-2 py-1 border border-gray-200 dark:border-[var(--border-color)] rounded text-sm text-center"
                        value={maxExecutions}
                        onChange={(e) => handleMaxExecutionsChange(Number(e.target.value))}
                        onClick={(e) => e.stopPropagation()}
                    />
                    <span className="text-sm">vez(es) por</span>
                    <select
                        className="px-2 py-1 border border-gray-200 dark:border-[var(--border-color)] rounded text-sm"
                        value={period}
                        onChange={(e) => handlePeriodChange(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <option value="hour">Hora</option>
                        <option value="day">Dia</option>
                        <option value="week">Semana</option>
                        <option value="month">Mês</option>
                        <option value="forever">Sempre</option>
                    </select>
                </div>

                <div className={nodeStyles.nextStep}>
                    <span>Próximo passo</span>
                    <div className="w-3 h-3 rounded-full bg-[#ef4444] border-2 border-white shadow"></div>
                </div>
            </div>

            <Handle type="target" position={Position.Left} className={`${nodeStyles.handle} !bg-[#ef4444]`} />
            <Handle type="source" position={Position.Right} className={`${nodeStyles.handle} !bg-[#ef4444]`} />
            <Handle type="source" position={Position.Right} id="blocked" className={`${nodeStyles.handle} !bg-[#fbbf24]`} style={{ top: '80%' }} />
        </div>
    );
}

// ============ NÓ DE GRAVAR INFO ============
function SaveInfoNode({ data, selected, id }: CustomNodeProps) {
    const { updateConfig, deleteNode, duplicateNode } = useNodeConfig(id, data.config);
    const [fieldName, setFieldName] = useState(data.config?.fieldName || '');
    const [fieldValue, setFieldValue] = useState(data.config?.fieldValue || '');

    return (
        <div className={`group ${nodeStyles.wrapper} ${selected ? 'ring-2 ring-[var(--primary)] ring-offset-2' : ''}`}>
            <div className={nodeStyles.floatingButtons}>
                <button onClick={duplicateNode} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-gray-700">
                    <Icons.Duplicate /> Duplicar
                </button>
                <button onClick={deleteNode} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-red-600">
                    <Icons.Delete /> Remover
                </button>
            </div>

            <div className="flex items-center justify-between px-4 py-3 bg-[#3b82f6] rounded-t-xl">
                <div className="flex items-center gap-2 text-white">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">💾</div>
                    <div>
                        <div className="font-semibold text-sm">Gravar info</div>
                        <div className="text-xs opacity-80">Salvar campo do contato</div>
                    </div>
                </div>
            </div>

            <div className={nodeStyles.body}>
                <div className="mb-3">
                    <label className="text-xs text-gray-500 mb-1 block">Nome do campo</label>
                    <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-200 dark:border-[var(--border-color)] rounded-lg text-sm"
                        placeholder="Ex: nome, email, interesse"
                        value={fieldName}
                        onChange={(e) => { setFieldName(e.target.value); updateConfig({ fieldName: e.target.value }); }}
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>

                <div className="mb-3">
                    <label className="text-xs text-gray-500 mb-1 block">Valor</label>
                    <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-200 dark:border-[var(--border-color)] rounded-lg text-sm"
                        placeholder="Digite @ para usar variáveis"
                        value={fieldValue}
                        onChange={(e) => { setFieldValue(e.target.value); updateConfig({ fieldValue: e.target.value }); }}
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>

                <div className={nodeStyles.nextStep}>
                    <span>Próximo passo</span>
                    <div className="w-3 h-3 rounded-full bg-[#3b82f6] border-2 border-white shadow"></div>
                </div>
            </div>

            <Handle type="target" position={Position.Left} className={`${nodeStyles.handle} !bg-[#3b82f6]`} />
            <Handle type="source" position={Position.Right} className={`${nodeStyles.handle} !bg-[#3b82f6]`} />
        </div>
    );
}

// ============ NÓ DE MOVER DE FLUXO ============
function MoveFlowNode({ data, selected, id }: CustomNodeProps) {
    const { updateConfig, deleteNode, duplicateNode } = useNodeConfig(id, data.config);
    const { allFlows } = useContext(FlowDataContext);
    const [targetFlow, setTargetFlow] = useState(data.config?.targetFlow || '');

    return (
        <div className={`group ${nodeStyles.wrapper} ${selected ? 'ring-2 ring-[var(--primary)] ring-offset-2' : ''}`}>
            <div className={nodeStyles.floatingButtons}>
                <button onClick={duplicateNode} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-gray-700">
                    <Icons.Duplicate /> Duplicar
                </button>
                <button onClick={deleteNode} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-red-600">
                    <Icons.Delete /> Remover
                </button>
            </div>

            <div className="flex items-center justify-between px-4 py-3 bg-[#8b5cf6] rounded-t-xl">
                <div className="flex items-center gap-2 text-white">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">↗️</div>
                    <div>
                        <div className="font-semibold text-sm">Mover de fluxo</div>
                        <div className="text-xs opacity-80">Redirecionar contato</div>
                    </div>
                </div>
            </div>

            <div className={nodeStyles.body}>
                <p className="text-xs text-gray-400 mb-3">Mover o contato para outro fluxo</p>

                <div className="mb-3">
                    <label className="text-xs text-gray-500 mb-1 block">Selecione o fluxo de destino</label>
                    <select
                        className="w-full px-3 py-2 border border-gray-200 dark:border-[var(--border-color)] rounded-lg text-sm"
                        value={targetFlow}
                        onChange={(e) => { 
                            setTargetFlow(e.target.value); 
                            updateConfig({ targetFlow: e.target.value }); 
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <option value="">Selecione um fluxo...</option>
                        {allFlows.map(f => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                    </select>
                </div>

                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg mb-3">
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                        ⚠️ O contato será transferido e este fluxo será encerrado
                    </p>
                </div>
            </div>

            <Handle type="target" position={Position.Left} className={`${nodeStyles.handle} !bg-[#8b5cf6]`} />
        </div>
    );
}

// ============ NÓ DE RANDOMIZER ============
function RandomizerNode({ data, selected, id }: CustomNodeProps) {
    const { updateConfig, deleteNode, duplicateNode } = useNodeConfig(id, data.config);
    const [paths, setPaths] = useState<Array<{ name: string; weight: number }>>(
        data.config?.paths || [{ name: 'Caminho A', weight: 50 }, { name: 'Caminho B', weight: 50 }]
    );

    const addPath = () => {
        if (paths.length < 5) {
            const newPaths = [...paths, { name: `Caminho ${String.fromCharCode(65 + paths.length)}`, weight: 0 }];
            setPaths(newPaths);
            updateConfig({ paths: newPaths });
        }
    };

    return (
        <div className={`group ${nodeStyles.wrapper} ${selected ? 'ring-2 ring-[var(--primary)] ring-offset-2' : ''}`}>
            <div className={nodeStyles.floatingButtons}>
                <button onClick={duplicateNode} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-gray-700">
                    <Icons.Duplicate /> Duplicar
                </button>
                <button onClick={deleteNode} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-red-600">
                    <Icons.Delete /> Remover
                </button>
            </div>

            <div className="flex items-center justify-between px-4 py-3 bg-[#22c55e] rounded-t-xl">
                <div className="flex items-center gap-2 text-white">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">🎲</div>
                    <div>
                        <div className="font-semibold text-sm">Randomizer</div>
                        <div className="text-xs opacity-80">Distribuição aleatória</div>
                    </div>
                </div>
            </div>

            <div className={nodeStyles.body}>
                <p className="text-xs text-gray-400 mb-3">Distribua contatos aleatoriamente entre caminhos</p>

                <div className="space-y-2 mb-3">
                    {paths.map((path, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'][idx] }}></div>
                            <span className="text-sm flex-1">{path.name}</span>
                            <input
                                type="number"
                                min={0}
                                max={100}
                                className="w-14 px-2 py-1 border border-gray-200 dark:border-[var(--border-color)] rounded text-sm text-center"
                                value={path.weight}
                                onChange={(e) => {
                                    const newPaths = [...paths];
                                    newPaths[idx].weight = Number(e.target.value);
                                    setPaths(newPaths);
                                    updateConfig({ paths: newPaths });
                                }}
                                onClick={(e) => e.stopPropagation()}
                            />
                            <span className="text-xs text-gray-400">%</span>
                        </div>
                    ))}
                </div>

                {paths.length < 5 && (
                    <button
                        onClick={(e) => { e.stopPropagation(); addPath(); }}
                        className="w-full py-2 text-sm text-[#22c55e] border border-dashed border-[#22c55e] rounded-lg hover:bg-[#22c55e]/10"
                    >
                        + Adicionar caminho
                    </button>
                )}
            </div>

            <Handle type="target" position={Position.Left} className={`${nodeStyles.handle} !bg-[#22c55e]`} />
            {paths.map((_, idx) => (
                <Handle
                    key={idx}
                    type="source"
                    position={Position.Right}
                    id={`path-${idx}`}
                    className={`${nodeStyles.handle}`}
                    style={{ top: `${35 + idx * 15}%`, backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'][idx] }}
                />
            ))}
        </div>
    );
}

// ============ NÓ DE FAKE CALL ============
function FakeCallNode({ data, selected, id }: CustomNodeProps) {
    const { updateConfig, deleteNode, duplicateNode } = useNodeConfig(id, data.config);
    const [callDuration, setCallDuration] = useState(data.config?.callDuration || 10);

    return (
        <div className={`group ${nodeStyles.wrapper} ${selected ? 'ring-2 ring-[var(--primary)] ring-offset-2' : ''}`}>
            <div className={nodeStyles.floatingButtons}>
                <button onClick={duplicateNode} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-gray-700">
                    <Icons.Duplicate /> Duplicar
                </button>
                <button onClick={deleteNode} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-red-600">
                    <Icons.Delete /> Remover
                </button>
            </div>

            <div className="flex items-center justify-between px-4 py-3 bg-[#14b8a6] rounded-t-xl">
                <div className="flex items-center gap-2 text-white">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">📞</div>
                    <div>
                        <div className="font-semibold text-sm">Fake Call</div>
                        <div className="text-xs opacity-80">Simular chamada</div>
                    </div>
                </div>
            </div>

            <div className={nodeStyles.body}>
                <p className="text-xs text-gray-400 mb-3">Simula uma tentativa de chamada para o contato</p>

                <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm">Duração da simulação:</span>
                    <input
                        type="number"
                        min={5}
                        max={60}
                        className="w-16 px-2 py-1 border border-gray-200 dark:border-[var(--border-color)] rounded text-sm text-center"
                        value={callDuration}
                        onChange={(e) => { setCallDuration(Number(e.target.value)); updateConfig({ callDuration: Number(e.target.value) }); }}
                        onClick={(e) => e.stopPropagation()}
                    />
                    <span className="text-sm">segundos</span>
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg mb-3">
                    <p className="text-xs text-blue-700 dark:text-blue-400">
                        ℹ️ Isso envia uma notificação de chamada recebida para o WhatsApp do contato
                    </p>
                </div>

                <div className={nodeStyles.nextStep}>
                    <span>Próximo passo</span>
                    <div className="w-3 h-3 rounded-full bg-[#14b8a6] border-2 border-white shadow"></div>
                </div>
            </div>

            <Handle type="target" position={Position.Left} className={`${nodeStyles.handle} !bg-[#14b8a6]`} />
            <Handle type="source" position={Position.Right} className={`${nodeStyles.handle} !bg-[#14b8a6]`} />
        </div>
    );
}

// ============ NÓ DE CONTATOS ============
function ContactsNode({ data, selected, id }: CustomNodeProps) {
    const { updateConfig, deleteNode, duplicateNode } = useNodeConfig(id, data.config);
    const [action, setAction] = useState(data.config?.action || 'addTag');
    const [tagName, setTagName] = useState(data.config?.tagName || '');

    return (
        <div className={`group ${nodeStyles.wrapper} ${selected ? 'ring-2 ring-[var(--primary)] ring-offset-2' : ''}`}>
            <div className={nodeStyles.floatingButtons}>
                <button onClick={duplicateNode} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-gray-700">
                    <Icons.Duplicate /> Duplicar
                </button>
                <button onClick={deleteNode} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-red-600">
                    <Icons.Delete /> Remover
                </button>
            </div>

            <div className="flex items-center justify-between px-4 py-3 bg-[#6366f1] rounded-t-xl">
                <div className="flex items-center gap-2 text-white">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">👥</div>
                    <div>
                        <div className="font-semibold text-sm">Contatos</div>
                        <div className="text-xs opacity-80">Gerenciar contato</div>
                    </div>
                </div>
            </div>

            <div className={nodeStyles.body}>
                <div className="mb-3">
                    <label className="text-xs text-gray-500 mb-1 block">Ação</label>
                    <select
                        className="w-full px-3 py-2 border border-gray-200 dark:border-[var(--border-color)] rounded-lg text-sm"
                        value={action}
                        onChange={(e) => { setAction(e.target.value); updateConfig({ action: e.target.value }); }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <option value="addTag">Adicionar tag</option>
                        <option value="removeTag">Remover tag</option>
                        <option value="block">Bloquear contato</option>
                        <option value="unblock">Desbloquear contato</option>
                        <option value="optOut">Marcar como opt-out</option>
                        <option value="changeCategory">Alterar categoria</option>
                    </select>
                </div>

                {(action === 'addTag' || action === 'removeTag') && (
                    <div className="mb-3">
                        <label className="text-xs text-gray-500 mb-1 block">Nome da tag</label>
                        <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-200 dark:border-[var(--border-color)] rounded-lg text-sm"
                            placeholder="Ex: cliente_vip, interessado"
                            value={tagName}
                            onChange={(e) => { setTagName(e.target.value); updateConfig({ tagName: e.target.value }); }}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                )}

                {action === 'changeCategory' && (
                    <div className="mb-3">
                        <label className="text-xs text-gray-500 mb-1 block">Nova categoria</label>
                        <select
                            className="w-full px-3 py-2 border border-gray-200 dark:border-[var(--border-color)] rounded-lg text-sm"
                            value={data.config?.category || ''}
                            onChange={(e) => updateConfig({ category: e.target.value })}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <option value="">Selecione uma categoria</option>
                            {['Marketing', 'Pré-vendas', 'Venda', 'Pós-venda', 'Atendimento', 'Suporte'].map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className={nodeStyles.nextStep}>
                    <span>Próximo passo</span>
                    <div className="w-3 h-3 rounded-full bg-[#6366f1] border-2 border-white shadow"></div>
                </div>
            </div>

            <Handle type="target" position={Position.Left} className={`${nodeStyles.handle} !bg-[#6366f1]`} />
            <Handle type="source" position={Position.Right} className={`${nodeStyles.handle} !bg-[#6366f1]`} />
        </div>
    );
}

// ============ NÓ DE MULTI CONDIÇÃO ============
function MultiConditionNode({ data, selected, id }: CustomNodeProps) {
    const { updateConfig, deleteNode, duplicateNode } = useNodeConfig(id, data.config);
    const [conditions, setConditions] = useState<Array<{ field: string; operator: string; value: string }>>(
        data.config?.conditions || [{ field: '', operator: 'equals', value: '' }]
    );

    const addCondition = () => {
        if (conditions.length < 5) {
            const newConditions = [...conditions, { field: '', operator: 'equals', value: '' }];
            setConditions(newConditions);
            updateConfig({ conditions: newConditions });
        }
    };

    return (
        <div className={`group ${nodeStyles.wrapper} ${selected ? 'ring-2 ring-[var(--primary)] ring-offset-2' : ''}`}>
            <div className={nodeStyles.floatingButtons}>
                <button onClick={duplicateNode} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-gray-700">
                    <Icons.Duplicate /> Duplicar
                </button>
                <button onClick={deleteNode} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs hover:bg-red-600">
                    <Icons.Delete /> Remover
                </button>
            </div>

            <div className="flex items-center justify-between px-4 py-3 bg-[#ec4899] rounded-t-xl">
                <div className="flex items-center gap-2 text-white">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">🔀</div>
                    <div>
                        <div className="font-semibold text-sm">Multi condição</div>
                        <div className="text-xs opacity-80">Múltiplas verificações</div>
                    </div>
                </div>
            </div>

            <div className={nodeStyles.body}>
                <p className="text-xs text-gray-400 mb-3">Execute diferentes caminhos baseado em condições</p>

                <div className="space-y-2 mb-3">
                    {conditions.map((cond, idx) => (
                        <div key={idx} className="p-2 bg-gray-50 dark:bg-[var(--bg-glass)] rounded-lg">
                            <div className="flex items-center gap-1 mb-1">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'][idx] }}></div>
                                <span className="text-xs font-medium">Condição {idx + 1}</span>
                            </div>
                            <div className="flex gap-1">
                                <input
                                    type="text"
                                    className="flex-1 px-2 py-1 border border-gray-200 dark:border-[var(--border-color)] rounded text-xs"
                                    placeholder="Campo"
                                    value={cond.field}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                        const newConditions = [...conditions];
                                        newConditions[idx].field = e.target.value;
                                        setConditions(newConditions);
                                        updateConfig({ conditions: newConditions });
                                    }}
                                />
                                <select
                                    className="px-1 py-1 border border-gray-200 dark:border-[var(--border-color)] rounded text-xs"
                                    value={cond.operator}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                        const newConditions = [...conditions];
                                        newConditions[idx].operator = e.target.value;
                                        setConditions(newConditions);
                                        updateConfig({ conditions: newConditions });
                                    }}
                                >
                                    <option value="equals">=</option>
                                    <option value="contains">contém</option>
                                    <option value="gt">&gt;</option>
                                    <option value="lt">&lt;</option>
                                </select>
                                <input
                                    type="text"
                                    className="flex-1 px-2 py-1 border border-gray-200 dark:border-[var(--border-color)] rounded text-xs"
                                    placeholder="Valor"
                                    value={cond.value}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                        const newConditions = [...conditions];
                                        newConditions[idx].value = e.target.value;
                                        setConditions(newConditions);
                                        updateConfig({ conditions: newConditions });
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {conditions.length < 5 && (
                    <button
                        onClick={(e) => { e.stopPropagation(); addCondition(); }}
                        className="w-full py-2 text-sm text-[#ec4899] border border-dashed border-[#ec4899] rounded-lg hover:bg-[#ec4899]/10"
                    >
                        + Adicionar condição
                    </button>
                )}
            </div>

            <Handle type="target" position={Position.Left} className={`${nodeStyles.handle} !bg-[#ec4899]`} />
            {conditions.map((_, idx) => (
                <Handle
                    key={idx}
                    type="source"
                    position={Position.Right}
                    id={`condition-${idx}`}
                    className={`${nodeStyles.handle}`}
                    style={{ top: `${30 + idx * 12}%`, backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'][idx] }}
                />
            ))}
            <Handle type="source" position={Position.Right} id="else" className={`${nodeStyles.handle} !bg-gray-400`} style={{ top: '90%' }} />
        </div>
    );
}

// ============ MODAL CRIAR TEMPLATE ============
interface CreateTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    accountId: string;
    onSuccess: (templateName: string) => void;
    withButtons?: boolean;
}

function CreateTemplateModal({ isOpen, onClose, accountId, onSuccess, withButtons = false }: CreateTemplateModalProps) {
    const [name, setName] = useState('');
    const [category, setCategory] = useState<'MARKETING' | 'UTILITY' | 'AUTHENTICATION'>('MARKETING');
    const [language, setLanguage] = useState('pt_BR');
    const [body, setBody] = useState('');
    const [footer, setFooter] = useState('');
    const [buttons, setButtons] = useState<Array<{ type: 'QUICK_REPLY' | 'URL'; text: string; url?: string }>>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleAddButton = () => {
        if (buttons.length < 3) {
            setButtons([...buttons, { type: 'QUICK_REPLY', text: '' }]);
        }
    };

    const handleRemoveButton = (idx: number) => {
        setButtons(buttons.filter((_, i) => i !== idx));
    };

    const handleUpdateButton = (idx: number, field: string, value: string) => {
        const newButtons = [...buttons];
        (newButtons[idx] as any)[field] = value;
        setButtons(newButtons);
    };

    const handleSubmit = async () => {
        if (!name.trim()) {
            setError('Nome do template é obrigatório');
            return;
        }
        if (!body.trim()) {
            setError('Corpo da mensagem é obrigatório');
            return;
        }

        // Validar nome (apenas letras minúsculas, números e underscore)
        const validName = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');

        try {
            setSaving(true);
            setError('');

            const templateData: CreateTemplateDto = {
                name: validName,
                category,
                language,
                body: body.trim(),
            };

            if (footer.trim()) {
                templateData.footer = footer.trim();
            }

            if (withButtons && buttons.length > 0) {
                templateData.buttons = buttons.filter(b => b.text.trim()).map(b => ({
                    type: b.type,
                    text: b.text.trim(),
                    ...(b.type === 'URL' && b.url ? { url: b.url } : {}),
                }));
            }

            const result = await metaTemplatesService.createTemplate(accountId, templateData);
            console.log('Template criado:', result);
            onSuccess(validName);
            onClose();

            // Limpar form
            setName('');
            setBody('');
            setFooter('');
            setButtons([]);
        } catch (err: any) {
            console.error('Erro ao criar template:', err);
            setError(err.response?.data?.message || 'Erro ao criar template. Verifique os dados.');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-[var(--border-color)] flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                        {withButtons ? '📝 Criar Template com Botão' : '📝 Criar Template de Texto'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Nome */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Nome do Template *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="meu_template_promocao"
                            className="w-full px-3 py-2 border border-gray-200 dark:border-[var(--border-color)] rounded-lg bg-white dark:bg-[var(--bg-glass)] text-sm"
                        />
                        <p className="text-xs text-gray-400 mt-1">Apenas letras minúsculas, números e underscore</p>
                    </div>

                    {/* Categoria e Idioma */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Categoria *
                            </label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value as any)}
                                className="w-full px-3 py-2 border border-gray-200 dark:border-[var(--border-color)] rounded-lg bg-white dark:bg-[var(--bg-glass)] text-sm"
                            >
                                {TEMPLATE_CATEGORIES.map(c => (
                                    <option key={c.value} value={c.value}>{c.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Idioma *
                            </label>
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 dark:border-[var(--border-color)] rounded-lg bg-white dark:bg-[var(--bg-glass)] text-sm"
                            >
                                {TEMPLATE_LANGUAGES.map(l => (
                                    <option key={l.value} value={l.value}>{l.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Corpo */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Corpo da Mensagem *
                        </label>
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder="Olá {{1}}! Temos uma oferta especial para você."
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-200 dark:border-[var(--border-color)] rounded-lg bg-white dark:bg-[var(--bg-glass)] text-sm resize-none"
                        />
                        <p className="text-xs text-gray-400 mt-1">Use {'{{1}}'}, {'{{2}}'} para variáveis</p>
                    </div>

                    {/* Rodapé */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Rodapé (opcional)
                        </label>
                        <input
                            type="text"
                            value={footer}
                            onChange={(e) => setFooter(e.target.value)}
                            placeholder="Responda SAIR para cancelar"
                            maxLength={60}
                            className="w-full px-3 py-2 border border-gray-200 dark:border-[var(--border-color)] rounded-lg bg-white dark:bg-[var(--bg-glass)] text-sm"
                        />
                    </div>

                    {/* Botões (se withButtons) */}
                    {withButtons && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Botões (máx. 3)
                            </label>
                            <div className="space-y-2">
                                {buttons.map((btn, idx) => (
                                    <div key={idx} className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-[var(--bg-glass)] rounded-lg">
                                        <select
                                            value={btn.type}
                                            onChange={(e) => handleUpdateButton(idx, 'type', e.target.value)}
                                            className="px-2 py-1 border border-gray-200 dark:border-[var(--border-color)] rounded text-sm bg-white dark:bg-[var(--bg-secondary)]"
                                        >
                                            <option value="QUICK_REPLY">Resposta Rápida</option>
                                            <option value="URL">URL</option>
                                        </select>
                                        <input
                                            type="text"
                                            value={btn.text}
                                            onChange={(e) => handleUpdateButton(idx, 'text', e.target.value)}
                                            placeholder="Texto do botão"
                                            className="flex-1 px-2 py-1 border border-gray-200 dark:border-[var(--border-color)] rounded text-sm bg-white dark:bg-[var(--bg-secondary)]"
                                        />
                                        {btn.type === 'URL' && (
                                            <input
                                                type="text"
                                                value={btn.url || ''}
                                                onChange={(e) => handleUpdateButton(idx, 'url', e.target.value)}
                                                placeholder="https://..."
                                                className="w-32 px-2 py-1 border border-gray-200 dark:border-[var(--border-color)] rounded text-sm bg-white dark:bg-[var(--bg-secondary)]"
                                            />
                                        )}
                                        <button
                                            onClick={() => handleRemoveButton(idx)}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                ))}
                                {buttons.length < 3 && (
                                    <button
                                        onClick={handleAddButton}
                                        className="w-full py-2 text-sm text-[#8b5cf6] border border-dashed border-[#8b5cf6] rounded-lg hover:bg-[#8b5cf6]/10"
                                    >
                                        + Adicionar botão
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Info box */}
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                            ⚠️ O template será enviado para aprovação da Meta. O processo pode levar de alguns minutos a 24 horas.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-[var(--border-color)] flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[var(--bg-glass)] rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="px-6 py-2 bg-[#8b5cf6] text-white rounded-lg font-medium hover:bg-[#7c3aed] transition-colors disabled:opacity-50"
                    >
                        {saving ? 'Enviando...' : 'Enviar para Aprovação'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============ MAIN EDITOR ============
function FlowEditorContent() {
    const params = useParams();
    const router = useRouter();
    const flowId = params.id as string;

    const [flow, setFlow] = useState<Flow | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [category, setCategory] = useState('');
    const [showTestModal, setShowTestModal] = useState(false);
    const [testPhone, setTestPhone] = useState('');
    const [testing, setTesting] = useState(false);
    const [instances, setInstances] = useState<Instance[]>([]);
    const [isAddingCategory, setIsAddingCategory] = useState(false);

    const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
    const { getNodes, getEdges } = useReactFlow();

    const addNodeByType = useCallback((type: string, label: string) => {
        const position = {
            x: 500 + Math.random() * 50,
            y: 300 + Math.random() * 50,
        };

        const newNode: Node = {
            id: `${type}-${Date.now()}`,
            type,
            position,
            data: { label, type, config: {} },
        };

        setNodes((nds: any) => [...nds, newNode]);
    }, [setNodes]);

    const nodeTypes: NodeTypes = useMemo(() => ({
        start: StartNode,
        message: MessageNode,
        question: QuestionNode,
        link: LinkNode,
        video: VideoNode,
        image: ImageNode,
        sticker: StickerNode,
        audio: AudioNode,
        document: DocumentNode,
        buttonsDefault: ButtonsDefaultNode,
        buttonsCopy: ButtonsCopyNode,
        buttonsActions: ButtonsActionsNode,
        webhook: WebhookNode,
        // AI Nodes
        openai: ChatGPTNode,
        chatgpt: ChatGPTNode,
        gemini: GeminiNode,
        llama: LlamaNode,
        anthropic: AnthropicNode,
        groq: GroqNode,
        customLlm: CustomLLMNode,
        // Channel-specific nodes
        sms: SMSNode,
        email: EmailNode,
        // Other nodes
        delay: DelayNode,
        condition: ConditionNode,
        end: EndNode,
        templateText: TemplateTextNode,
        templateButton: TemplateButtonNode,
        // Action nodes (NEW)
        limitExecution: LimitExecutionNode,
        saveInfo: SaveInfoNode,
        moveFlow: MoveFlowNode,
        randomizer: RandomizerNode,
        fakeCall: FakeCallNode,
        contacts: ContactsNode,
        multiCondition: MultiConditionNode,
    }), []);

    // Edge types - usando edge customizado com botão de delete
    const edgeTypes: EdgeTypes = useMemo(() => ({
        default: DeletableEdge,
    }), []);

    // Estados para sidebars redimensionáveis
    const [leftSidebarWidth, setLeftSidebarWidth] = useState(288); // 18rem = 288px
    const [rightSidebarWidth, setRightSidebarWidth] = useState(256); // 16rem = 256px
    const [isResizingLeft, setIsResizingLeft] = useState(false);
    const [isResizingRight, setIsResizingRight] = useState(false);

    // Handlers para resize das sidebars
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isResizingLeft) {
                const newWidth = Math.min(Math.max(e.clientX, 200), 450);
                setLeftSidebarWidth(newWidth);
            }
            if (isResizingRight) {
                const newWidth = Math.min(Math.max(window.innerWidth - e.clientX, 180), 400);
                setRightSidebarWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            setIsResizingLeft(false);
            setIsResizingRight(false);
        };

        if (isResizingLeft || isResizingRight) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isResizingLeft, isResizingRight]);

    // Load flow
    useEffect(() => {
        const loadFlow = async () => {
            try {
                const data = await flowsApi.getFlow(flowId);
                setFlow(data);
                setCategory(data.category || '');
                setNodes(data.nodes.map(n => ({ ...n, type: n.data.type })) as any);
                setEdges(data.edges.map((e: any) => ({ ...e, type: 'default' })) as any);
            } catch (error) {
                console.error('Erro ao carregar fluxo:', error);
                router.push('/flows');
            } finally {
                setLoading(false);
            }
        };
        loadFlow();
    }, [flowId, router, setNodes, setEdges]);

    // Load extra data (instances and other flows)
    const [allFlows, setAllFlows] = useState<Flow[]>([]);
    useEffect(() => {
        const loadExtraData = async () => {
            try {
                const [instancesData, flowsData] = await Promise.all([
                    instancesService.list(),
                    flowsApi.getFlows()
                ]);
                setInstances(instancesData);
                setAllFlows(flowsData.filter((f: any) => f.id !== flowId));
            } catch (error) {
                console.error('Erro ao carregar dados extras:', error);
            }
        };
        loadExtraData();
    }, [flowId]);

    const onConnect = useCallback(
        (connection: Connection) => {
            setEdges((eds: any) => addEdge({
                ...connection,
                id: `e-${connection.source}-${connection.target}-${Date.now()}`,
                type: 'default',
                animated: true,
            }, eds));
        },
        [setEdges]
    );

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();
            const nodeData = event.dataTransfer.getData('application/json');
            if (!nodeData) return;

            const { type, label } = JSON.parse(nodeData);
            const reactFlowBounds = event.currentTarget.getBoundingClientRect();
            const position = {
                x: event.clientX - reactFlowBounds.left - 150,
                y: event.clientY - reactFlowBounds.top - 50,
            };

            const newNode: Node = {
                id: `${type}-${Date.now()}`,
                type,
                position,
                data: { label, type, config: {} },
            };

            setNodes((nds: any) => [...nds, newNode]);
        },
        [setNodes]
    );

    const handleSave = async () => {
        if (!flow) return;
        try {
            setSaving(true);
            const currentNodes = getNodes();
            const currentEdges = getEdges();

            await flowsApi.updateFlow(flow.id, {
                name: flow.name,
                description: flow.description,
                category: category,
                nodes: currentNodes.map((n: any) => ({
                    id: n.id,
                    type: n.type,
                    position: n.position,
                    data: n.data,
                })) as any,
                edges: currentEdges.map((e: any) => ({
                    id: e.id,
                    source: e.source,
                    target: e.target,
                    sourceHandle: e.sourceHandle,
                    targetHandle: e.targetHandle,
                })) as any,
            });
            alert('Fluxo salvo!');
        } catch (error: any) {
            alert(error.response?.data?.message || 'Erro ao salvar');
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async () => {
        if (!flow) return;
        if (!testPhone.trim()) {
            alert('Por favor, insira um número de telefone para teste');
            return;
        }

        try {
            setTesting(true);
            const currentNodes = getNodes();

            // Verifica se tem mensagens para enviar
            const messageNodes = currentNodes.filter((n: any) =>
                ['message', 'question', 'video', 'image', 'audio'].includes(n.data?.type || n.type)
            );

            if (messageNodes.length === 0) {
                alert('Nenhuma mensagem encontrada no fluxo para testar');
                setTesting(false);
                return;
            }

            // Usar endpoint de teste do backend que já resolve contato e instância
            const result = await flowsApi.testFlow(flow.id, testPhone);

            alert(`✅ Teste iniciado!\n\nID da Execução: ${result.executionId}\nContato: ${result.contactName}\nInstância: ${result.instanceName}`);

            setShowTestModal(false);
            setTestPhone('');
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data?.message || 'Erro ao testar fluxo. Verifique se há uma instância conectada.');
        } finally {
            setTesting(false);
        }
    };

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-[var(--bg-primary)]">
                <div className="text-[var(--text-muted)]">Carregando editor...</div>
            </div>
        );
    }

    const categories = ['Marketing', 'Pré-vendas', 'Venda', 'Pós-venda', 'Atendimento', 'Suporte'];

    return (
        <FlowDataContext.Provider value={{ allFlows, category, setCategory }}>
            <div className="h-screen flex flex-col bg-gray-100 dark:bg-[var(--bg-primary)]">
                {/* Toolbar */}
                <div className="h-14 border-b border-gray-200 dark:border-[var(--border-color)] flex items-center justify-between px-4 bg-white dark:bg-[var(--bg-secondary)]">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push('/flows')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[var(--bg-glass)]">
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M19 12H5M12 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div>
                            <h1 className="font-semibold text-lg">{flow?.name}</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={() => setShowTestModal(true)} className="flex items-center gap-2 px-4 py-2 bg-[#14b8a6] text-white rounded-lg hover:bg-[#0d9488]">
                            🧪 Testar
                        </button>
                        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-[#22c55e] text-white rounded-lg hover:bg-[#16a34a]">
                            💾 {saving ? 'Salvando...' : 'Salvar'}
                        </button>
                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-[var(--bg-glass)] rounded-lg">
                            ↩️
                        </button>
                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-[var(--bg-glass)] rounded-lg">
                            ↪️
                        </button>
                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-[var(--bg-glass)] rounded-lg">
                            📤
                        </button>
                        <button onClick={() => router.push('/flows')} className="p-2 hover:bg-gray-100 dark:hover:bg-[var(--bg-glass)] rounded-lg">
                            ✕
                        </button>
                    </div>
                </div>

                <div className="flex-1 flex">
                    {/* Left Sidebar - Configurações (Redimensionável) */}
                    <div
                        className="border-r border-gray-200 dark:border-[var(--border-color)] bg-gray-50 dark:bg-[var(--bg-secondary)] overflow-y-auto p-4 flex-shrink-0"
                        style={{ width: leftSidebarWidth }}
                    >
                        <h3 className="text-xs font-semibold uppercase text-gray-400 mb-3">CONFIGURAÇÕES</h3>

                        {/* Categoria do fluxo */}
                        <div className="mb-4 p-4 bg-white dark:bg-[var(--bg-glass)] rounded-xl border border-gray-200 dark:border-[var(--border-color)] shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xl">🏷️</span>
                                <span className="font-semibold text-gray-800 dark:text-white">Categoria do fluxo</span>
                            </div>
                            <p className="text-xs text-gray-400 mb-3">
                                Selecione a categoria que representa o objetivo principal deste fluxo.
                            </p>
                            {isAddingCategory ? (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        className="flex-1 bg-white dark:bg-[var(--bg-secondary)] border border-gray-200 dark:border-[var(--border-color)] rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#14b8a6]"
                                        placeholder="Nova categoria..."
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                const val = e.currentTarget.value.trim();
                                                if (val) {
                                                    setCategory(val);
                                                    setIsAddingCategory(false);
                                                }
                                            } else if (e.key === 'Escape') {
                                                setIsAddingCategory(false);
                                            }
                                        }}
                                        onBlur={() => setIsAddingCategory(false)}
                                    />
                                </div>
                            ) : (
                                <select
                                    className="w-full bg-white dark:bg-[var(--bg-secondary)] border border-gray-200 dark:border-[var(--border-color)] rounded-lg px-3 py-2 text-sm"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                >
                                    <option value="">Selecione uma categoria</option>
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                    {category && !categories.includes(category) && (
                                        <option value={category}>{category}</option>
                                    )}
                                </select>
                            )}
                            <button 
                                onClick={() => setIsAddingCategory(true)}
                                className="text-[#14b8a6] text-xs mt-2 hover:underline"
                            >
                                + Configurar uma categoria
                            </button>
                        </div>

                        {/* Início do fluxo */}
                        <div className="mb-4 p-4 bg-white dark:bg-[var(--bg-glass)] rounded-xl border border-gray-200 dark:border-[var(--border-color)] shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 rounded-lg bg-[#14b8a6] flex items-center justify-center text-white">
                                    ▶️
                                </div>
                                <span className="font-semibold text-gray-800 dark:text-white">Início do fluxo</span>
                            </div>
                            <p className="text-xs text-gray-400 mb-3">
                                Esse é o início do fluxo, ele pode ser iniciado através das suas campanhas ou gatilhos.
                            </p>
                            <div className="flex items-center justify-end text-sm text-gray-400">
                                <span>Próximo passo</span>
                                <div className="w-3 h-3 rounded-full bg-[#14b8a6] ml-2"></div>
                            </div>

                            {/* Condições */}
                            <div className="mt-3 rounded-lg border border-gray-200 dark:border-[var(--border-color)] overflow-hidden">
                                <div className="px-3 py-2 bg-[#fbbf24] text-gray-800 font-semibold text-xs flex items-center gap-2">
                                    ⚙️ Condições
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-[var(--bg-glass)] space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span>🕐</span>
                                        <div>
                                            <div className="text-xs font-medium">Horário de funcionamento</div>
                                            <div className="text-xs text-gray-400">Clique no nó "Início" para configurar</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span>⚡</span>
                                        <div>
                                            <div className="text-xs font-medium">Gatilho</div>
                                            <div className="text-xs text-gray-400">Clique no nó "Início" para configurar</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Transportar contato */}
                        <div className="mb-4 p-4 bg-white dark:bg-[var(--bg-glass)] rounded-xl border border-gray-200 dark:border-[var(--border-color)] shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 rounded-lg bg-[#8b5cf6] flex items-center justify-center text-white">
                                    🔄
                                </div>
                                <span className="font-semibold text-gray-800 dark:text-white">Transportar contato</span>
                            </div>
                            <p className="text-xs text-gray-400 mb-3">
                                Redirecione o contato para outro fluxo de automação.
                            </p>

                            <div className="rounded-lg border border-gray-200 dark:border-[var(--border-color)] overflow-hidden">
                                <div className="px-3 py-2 bg-[#8b5cf6] text-white font-semibold text-xs flex items-center gap-2">
                                    ↗️ Ações
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-[var(--bg-glass)]">
                                    <button 
                                        onClick={() => addNodeByType('moveFlow', 'Mover de fluxo')}
                                        className="w-full py-2 bg-[#8b5cf6] text-white text-xs rounded-lg hover:bg-[#7c3aed] transition-colors"
                                    >
                                        + Novo transporte (Mover de Fluxo)
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Interromper contato */}
                        <div className="mb-4 p-4 bg-white dark:bg-[var(--bg-glass)] rounded-xl border border-gray-200 dark:border-[var(--border-color)] shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 rounded-lg bg-[#ef4444] flex items-center justify-center text-white">
                                    🛑
                                </div>
                                <span className="font-semibold text-gray-800 dark:text-white">Interromper contato</span>
                            </div>
                            <p className="text-xs text-gray-400 mb-3">
                                Encerra o fluxo atual para o contato.
                            </p>

                            <div className="rounded-lg border border-gray-200 dark:border-[var(--border-color)] overflow-hidden">
                                <div className="px-3 py-2 bg-[#ef4444] text-white font-semibold text-xs flex items-center gap-2">
                                    🛑 Ações
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-[var(--bg-glass)]">
                                    <button 
                                        onClick={() => addNodeByType('end', 'Fim do fluxo')}
                                        className="w-full py-2 bg-[#ef4444] text-white text-xs rounded-lg hover:bg-[#dc2626] transition-colors"
                                    >
                                        + Interromper fluxo (Fim)
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Resize Handle - Left Sidebar */}
                    <div
                        className="w-3 bg-gray-100 dark:bg-[var(--bg-secondary)] hover:bg-[#14b8a6] cursor-col-resize transition-colors flex-shrink-0 flex items-center justify-center group"
                        onMouseDown={(e) => {
                            e.preventDefault();
                            setIsResizingLeft(true);
                        }}
                    >
                        <div className="w-1 h-8 bg-gray-300 dark:bg-gray-600 group-hover:bg-white rounded-full" />
                    </div>

                    {/* Canvas */}
                    <div className="flex-1" onDragOver={onDragOver} onDrop={onDrop}>
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onConnect={onConnect}
                            nodeTypes={nodeTypes}
                            edgeTypes={edgeTypes}
                            fitView
                            snapToGrid
                            snapGrid={[15, 15]}
                            minZoom={0.1}
                            maxZoom={4}
                            deleteKeyCode={['Backspace', 'Delete']}
                            defaultEdgeOptions={{
                                type: 'default',
                                animated: true,
                            }}
                        >
                            <Controls className="!bg-white dark:!bg-[var(--bg-glass)] !border-gray-200 dark:!border-[var(--border-color)] !rounded-lg" />
                            <MiniMap className="!bg-white dark:!bg-[var(--bg-glass)] !rounded-lg" />
                            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e5e7eb" />
                        </ReactFlow>
                    </div>

                    {/* Resize Handle - Right Sidebar */}
                    <div
                        className="w-3 bg-gray-100 dark:bg-[var(--bg-secondary)] hover:bg-[#14b8a6] cursor-col-resize transition-colors flex-shrink-0 flex items-center justify-center group"
                        onMouseDown={(e) => {
                            e.preventDefault();
                            setIsResizingRight(true);
                        }}
                    >
                        <div className="w-1 h-8 bg-gray-300 dark:bg-gray-600 group-hover:bg-white rounded-full" />
                    </div>

                    {/* Right Sidebar - Componentes (Redimensionável) */}
                    <div
                        className="border-l border-gray-200 dark:border-[var(--border-color)] bg-white dark:bg-[var(--bg-secondary)] overflow-y-auto flex-shrink-0"
                        style={{ width: rightSidebarWidth }}
                    >
                        <div className="p-4">
                            {/* Título como Dispara.ai */}
                            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200 dark:border-[var(--border-color)]">
                                <span className="text-xl">🤔</span>
                                <span className="font-semibold text-gray-800 dark:text-white">Qual o primeiro passo?</span>
                            </div>

                            <input
                                type="text"
                                placeholder="🔍 Buscar"
                                className="w-full bg-gray-50 dark:bg-[var(--bg-glass)] border border-gray-200 dark:border-[var(--border-color)] rounded-lg px-3 py-2 text-sm mb-4"
                            />

                            {getNodesForChannel(flow?.channel).map((category) => (
                                <div key={category.id} className="mb-2">
                                    <h4 className="text-xs font-semibold text-gray-400 uppercase mb-1">
                                        {category.label}
                                    </h4>
                                    <div className="space-y-0">
                                        {category.nodes.map((node) => (
                                            <div
                                                key={node.type}
                                                draggable
                                                onDragStart={(e) => {
                                                    e.dataTransfer.setData('application/json', JSON.stringify({ type: node.type, label: node.label }));
                                                    e.dataTransfer.effectAllowed = 'move';
                                                }}
                                                className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-50 dark:hover:bg-[var(--bg-glass)] cursor-grab active:cursor-grabbing transition-colors"
                                            >
                                                <div
                                                    className="w-6 h-6 rounded flex items-center justify-center text-sm"
                                                    style={{ backgroundColor: `${node.color}20` }}
                                                >
                                                    {node.icon}
                                                </div>
                                                <span className="text-xs">{node.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>


            {/* Modal de Teste */}
            {showTestModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-xl w-full max-w-md mx-4 shadow-2xl">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-[var(--border-color)] flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                                🧪 Testar Fluxo
                            </h3>
                            <button onClick={() => setShowTestModal(false)} className="text-gray-400 hover:text-gray-600">
                                ✕
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                Digite um número de telefone para simular a execução do fluxo:
                            </p>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Número de telefone
                                </label>
                                <input
                                    type="tel"
                                    value={testPhone}
                                    onChange={(e) => setTestPhone(e.target.value)}
                                    placeholder="+55 11 99999-9999"
                                    className="w-full px-4 py-3 border border-gray-200 dark:border-[var(--border-color)] rounded-lg bg-white dark:bg-[var(--bg-glass)] text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#14b8a6]"
                                />
                            </div>
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg mb-4">
                                <p className="text-xs text-blue-700 dark:text-blue-400">
                                    ℹ️ O teste simulará a execução do fluxo e mostrará quantas mensagens seriam enviadas.
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowTestModal(false)}
                                    className="flex-1 px-4 py-2.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[var(--bg-glass)] rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleTest}
                                    disabled={testing || !testPhone.trim()}
                                    className="flex-1 px-4 py-2.5 bg-[#14b8a6] text-white rounded-lg font-medium hover:bg-[#0d9488] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {testing ? '⏳ Testando...' : '🚀 Iniciar Teste'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </FlowDataContext.Provider>
    );
}

// ============ WRAPPER COM PROVIDER ============
export default function FlowEditorPage() {
    return (
        <ReactFlowProvider>
            <FlowEditorContent />
        </ReactFlowProvider>
    );
}
