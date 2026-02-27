'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, User } from 'lucide-react';

interface DepartmentMembership {
    id: string;
    department: string;
    isManager: boolean;
}

interface Employee {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    role: string;
    department: string;
    position?: string | null;
    employeeCode?: string | null;
    isDirective: boolean;
    departmentMemberships: DepartmentMembership[];
}

interface OrgChartMapViewProps {
    employees: Employee[];
    departments: Record<string, string>;
    onNodeClick?: (id: string, currentPosition?: string) => void;
}

interface TreeNode {
    id: string;
    type: 'person' | 'department' | 'group';
    data?: Employee;
    label: string;
    subLabel?: string;
    children: TreeNode[];
    isExpanded?: boolean;
    level: number;
}

export function OrgChartMapView({ employees, departments, onNodeClick }: OrgChartMapViewProps) {
    const treeData = useMemo(() => {
        // Helper to find employee by position or name (fuzzy)
        const findByPos = (term: string) => employees.find(e =>
            e.position?.toLowerCase().includes(term.toLowerCase())
        );

        // 1. ROOT: CEO
        let ceo = findByPos('CEO') || employees.find(e => e.name.includes('Huberto'));
        if (!ceo) ceo = employees.find(e => e.role === 'SUPERADMIN'); // Fallback

        // 2. LEVEL 2: C-Level & Executives
        // Exclude CEO from search
        const others = employees.filter(e => e.id !== ceo?.id);

        const cto = others.find(e => e.position?.includes('CTO') || e.name.includes('Francisco'));
        const coo = others.find(e => e.position?.includes('COO'));
        const engManager = others.find(e => e.position === 'Engineering Manager');
        const deputyEngManager = others.find(e => e.position?.includes('Deputy Engineering'));

        // Executives group (Level 2)
        const executives = [cto, coo, engManager].filter(Boolean) as Employee[];

        // 3. LEVEL 3: Departments & Leads
        // We need to group remaining employees by department
        // But some might be "Leads" directly under executives.

        // Let's build the tree from CEO down.

        const root: TreeNode = {
            id: 'root',
            type: 'person',
            data: ceo,
            label: ceo?.name || 'CEO',
            subLabel: ceo?.position || 'CEO',
            level: 0,
            children: []
        };

        // Function to build department node
        const buildDeptNode = (deptKey: string, deptName: string): TreeNode => {
            const deptEmps = others.filter(e => e.department === deptKey && !executives.includes(e));

            // Find Lead/Manager
            const manager = deptEmps.find(e =>
                e.departmentMemberships.find(m => m.department === deptKey)?.isManager ||
                e.position?.toLowerCase().includes('lead') ||
                e.position?.toLowerCase().includes('manager')
            );

            const staff = deptEmps.filter(e => e !== manager);

            const children: TreeNode[] = [];

            // Recursive helper for staff (if we want sub-hierarchy, but flat for now)
            staff.forEach(s => {
                children.push({
                    id: s.id,
                    type: 'person',
                    data: s,
                    label: s.name,
                    subLabel: s.position || s.role,
                    level: 3,
                    children: []
                });
            });

            if (manager) {
                return {
                    id: manager.id,
                    type: 'person',
                    data: manager,
                    label: manager.name,
                    subLabel: manager.position || `${deptName} Lead`,
                    level: 2,
                    children: children
                };
            } else {
                // If no manager, creat a dummy Dept node or just list employees?
                // User wants a "Lead" node. If none, maybe create a Dept Label Node
                return {
                    id: `dept-${deptKey}`,
                    type: 'department',
                    label: deptName,
                    level: 2,
                    children: children
                };
            }
        };

        // Add Executives to Root Children
        executives.forEach(exec => {
            const execNode: TreeNode = {
                id: exec.id,
                type: 'person',
                data: exec,
                label: exec.name,
                subLabel: exec.position || 'Executive',
                level: 1,
                children: []
            };

            // If exec is CTO, he oversees specific depts?
            // For now, let's attach ALL departments to the "Operations" or "CTO" if implied, 
            // but the prompt says CEO -> CTO/COO -> Depts.
            // Let's attach departments to the Global Root's children roughly.

            // Actually, usually Departments are under the COO or CTO.
            // Let's default to attaching Departments to the CTO (Francisco) if he exists, else Root.

            if (exec.position?.includes('CTO') || exec.name.includes('Francisco')) {
                // Attach Departments here
                Object.entries(departments).forEach(([key, name]) => {
                    if (key === 'ADMINISTRATION' || key === 'OTHER') return; // Admin usually separate
                    execNode.children.push(buildDeptNode(key, name));
                });
            }

            root.children.push(execNode);
        });

        // Administration often under CEO or COO directly
        const adminNode = buildDeptNode('ADMINISTRATION', 'Administración & HR');
        if (adminNode.children.length > 0 || adminNode.type === 'person') {
            root.children.push(adminNode); // Put Admin under CEO direct
        }

        // If no CTO found, attach depts to CEO
        if (!executives.some(e => e.position?.includes('CTO'))) {
            Object.entries(departments).forEach(([key, name]) => {
                if (key === 'ADMINISTRATION') return;
                root.children.push(buildDeptNode(key, name));
            });
        }

        return root;
    }, [employees, departments]);

    return (
        <div className="w-full overflow-x-auto pb-12 pt-8 min-h-[600px] bg-neutral-50/50 dark:bg-neutral-900/20 rounded-xl border border-neutral-200 dark:border-neutral-800 backdrop-blur-sm">
            <div className="min-w-max px-8 flex flex-col items-center">
                <NodeRenderer node={treeData} onNodeClick={onNodeClick} />
            </div>
        </div>
    );
}

function NodeRenderer({ node, onNodeClick }: { node: TreeNode; onNodeClick?: (id: string, pos?: string) => void }) {
    if (!node) return null;

    const isPerson = node.type === 'person';
    const isDept = node.type === 'department';

    return (
        <div className="flex flex-col items-center">
            {/* Node Card */}
            <div className={`relative z-10 ${node.level > 0 ? 'mt-8' : ''}`}>

                {/* Vertical Line above if not root */}
                {node.level > 0 && (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-0.5 h-8 bg-olive-500/50" />
                )}

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: isPerson ? 1.02 : 1 }}
                    onClick={() => isPerson && onNodeClick?.(node.id, node.data?.position || '')}
                    className={`
                        relative flex items-center gap-3 p-2 pr-6 rounded-full border transition-all cursor-default
                        ${isPerson ? 'cursor-pointer hover:shadow-lg' : ''}
                        ${node.level === 0 ? 'bg-olive-800 text-white border-olive-700 min-w-[280px]' : ''}
                        ${node.level === 1 ? 'bg-olive-700 text-white border-olive-600 min-w-[260px]' : ''}
                        ${node.level === 2 ? 'bg-olive-100 dark:bg-olive-900/40 text-olive-900 dark:text-olive-100 border-olive-200 dark:border-olive-700 min-w-[240px]' : ''}
                        ${node.level > 2 ? 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border-neutral-200 dark:border-neutral-700 min-w-[220px]' : ''}
                    `}
                >
                    {isPerson && node.data?.image && (
                        <img src={node.data.image} alt="" className="w-12 h-12 rounded-full border-2 border-white dark:border-neutral-800 object-cover bg-white" />
                    )}
                    {isPerson && !node.data?.image && (
                        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold">
                            {node.data?.name.charAt(0)}
                        </div>
                    )}

                    {/* Dept Icon if Dept Node */}
                    {isDept && (
                        <div className="w-12 h-12 rounded-full bg-olive-200 dark:bg-olive-800 flex items-center justify-center">
                            <span className="text-xl font-bold text-olive-700 dark:text-olive-200">
                                {node.label.charAt(0)}
                            </span>
                        </div>
                    )}

                    <div className="text-left">
                        <p className={`font-bold leading-tight ${node.level < 2 ? 'text-lg' : 'text-sm'}`}>
                            {node.label}
                        </p>
                        {node.subLabel && (
                            <p className={`text-xs opacity-90 ${node.level < 2 ? 'font-medium' : ''} uppercase tracking-wider`}>
                                {node.subLabel}
                            </p>
                        )}
                        {/* Edit Hint */}
                        {isPerson && (
                            <div className="absolute top-1 right-2 opacity-0 group-hover:opacity-100">
                                <span className="text-[10px] bg-black/20 text-white px-1 rounded">Edit</span>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Children Connnectors */}
            {node.children.length > 0 && (
                <div className="relative flex pt-8">
                    {/* Horizontal bar connecting children */}
                    {node.children.length > 1 && (
                        <div className="absolute top-0 left-0 w-full h-8">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-olive-500/50" />
                            <div className="absolute top-4 left-[calc(50%/var(--child-count))] right-[calc(50%/var(--child-count))] h-0.5 bg-olive-500/50"
                                style={{
                                    left: `calc(100% / ${node.children.length} / 2)`,
                                    right: `calc(100% / ${node.children.length} / 2)`
                                }}
                            />
                        </div>
                    )}

                    {/* Recursive Children */}
                    <div className="flex gap-8 items-start">
                        {node.children.map((child, idx) => (
                            <div key={child.id} className="relative flex flex-col items-center">
                                {/* Vertical line to child */}
                                <div className="w-0.5 h-8 bg-olive-500/50 absolute -top-8" />
                                <NodeRenderer node={child} onNodeClick={onNodeClick} />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
