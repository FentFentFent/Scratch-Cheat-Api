class CheatAPI {
    constructor(vmInstance, runtime) {
        this.vm = vmInstance;
        this.runtime = runtime;
        this.hooks = new Map(); // primitive -> { original: [original func], branch: [block id]}
        runtime.on(runtime.constructor.PROJECT_STOP_ALL, () => this.hooks = new Map());
        window.inst = this;
        Scratch.gui.getBlockly().then(Blockly => { // Blockly hook for tooltips.
            const wsProto = Blockly.WorkspaceSvg.prototype;
            const ogNewBlock = wsProto.newBlock;
            const info = this.getInfo();
            wsProto.newBlock = function (...args) { // rest param for future proofing.
                const type = args[0];
                const block = ogNewBlock.apply(this, args);
                if (type.startsWith('cheatapi_') && !type.startsWith('cheatapi_menu_')) { // If this block is owned by us, and it isn't one of our menus.
                    // Iterate through all block infos and set tooltips on this block if existent
                    for (let blockInfo of info.blocks) {
                        const fullType = 'cheatapi_' + blockInfo.opcode;
                        if (type == fullType) {
                            if (blockInfo.tooltip) {
                                block.setTooltip(blockInfo.tooltip);
                            }
                        }
                    }
                }
                return block;
            }
        })
    }

    getInfo() {
        return {
            id: 'cheatapi',
            name: 'Cheat',
            color1: '#FF6699',
            color2: '#FF3366',
            color3: '#CC2255',
            blocks: [
                {
                    opcode: 'stopCustomBlocks',
                    text: 'stop custom blocks for [PROCCODE] in [TARGET]',
                    tooltip: 'Stops all running instances of a specific custom procedure in the selected target.',
                    arguments: {
                        TARGET: { type: Scratch.ArgumentType.STRING, defaultValue: '_stage_', menu: 'targetMenu2' },
                        PROCCODE: {
                            type: Scratch.ArgumentType.STRING,
                            defaultValue: (() => {
                                for (const target of vm.runtime.targets) {
                                    for (const block of Object.values(target.blocks._blocks)) {
                                        if (block.opcode === 'procedures_prototype') {
                                            return block.parent;
                                        }
                                    }
                                }
                                return '';
                            })(),
                            menu: 'proccodeMenu'
                        }
                    }
                },
                {
                    opcode: 'stopBroadcasts',
                    text: 'stop broadcasts for [MESSAGE] in [TARGET]',
                    blockType: Scratch.BlockType.COMMAND,
                    tooltip: 'Stops all scripts listening to a specific broadcast message in the selected target.',
                    arguments: {
                        TARGET: { type: Scratch.ArgumentType.STRING, defaultValue: '_stage_', menu: 'targetMenu2' },
                        MESSAGE: {
                            type: Scratch.ArgumentType.STRING,
                            defaultValue: Object.values(vm.runtime.getTargetForStage().variables).find(e => e.type == 'broadcast_msg')?.id || '',
                            menu: 'broadcastMenu'
                        }
                    }
                },
                {
                    opcode: 'stopSprite',
                    blockType: Scratch.BlockType.COMMAND,
                    text: 'stop [TARGET]',
                    tooltip: 'Immediately stops all scripts running in the selected target.',
                    arguments: {
                        TARGET: { type: Scratch.ArgumentType.STRING, defaultValue: '_stage_', menu: 'targetMenu2' }
                    }
                },
                {
                    opcode: 'runSprite',
                    blockType: Scratch.BlockType.COMMAND,
                    text: 'run [TARGET]',
                    tooltip: 'Starts running the selected target as if the green flag was clicked.',
                    arguments: {
                        TARGET: { type: Scratch.ArgumentType.STRING, defaultValue: '_stage_', menu: 'targetMenu2' }
                    }
                },
                {
                    opcode: 'thisTarget',
                    blockType: Scratch.BlockType.REPORTER,
                    text: 'this target',
                    tooltip: 'Returns the current target context (sprite or stage) the script is running in.',
                    disableMonitor: true
                },
                {
                    opcode: 'setCustomArg',
                    blockType: Scratch.BlockType.COMMAND,
                    text: 'set argument [NAME] to [VALUE]',
                    tooltip: 'Overrides a procedure argument value in the current stack frame.',
                    arguments: {
                        NAME: { type: Scratch.ArgumentType.STRING, defaultValue: 'ArgumentName' },
                        VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: '1' }
                    }
                },
                {
                    opcode: 'getCustomArg',
                    blockType: Scratch.BlockType.REPORTER,
                    text: 'argument [NAME]',
                    tooltip: 'Gets a procedure argument from the current execution context.',
                    arguments: {
                        NAME: { type: Scratch.ArgumentType.STRING, defaultValue: 'ArgumentName' },
                        VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: '1' }
                    }
                },
                {
                    opcode: 'stopBlock',
                    tooltip: 'Cancels execution of the original hooked primitive block.',
                    blockType: Scratch.BlockType.COMMAND,
                    text: 'cancel original block'
                },
                {
                    opcode: 'returnBlock',
                    blockType: Scratch.BlockType.COMMAND,
                    tooltip: 'Queues a return value for a hooked primitive without stopping execution unless explicitly handled.',
                    text: 'return [VALUE] for this hook',
                    arguments: {
                        VALUE: {
                            type: Scratch.ArgumentType.STRING,
                            defaultValue: '1'
                        }
                    },
                    isTerminal: true
                },
                {
                    opcode: 'getArgs',
                    blockType: Scratch.BlockType.REPORTER,
                    text: 'hook arguments',
                    tooltip: 'Returns all arguments passed into the hooked primitive call.',
                    disableMonitor: true
                },
                {
                    opcode: 'getArg',
                    blockType: Scratch.BlockType.REPORTER,
                    text: 'hook argument [ARG]',
                    tooltip: 'Gets a specific argument from the hooked primitive call.',
                    arguments: {
                        ARG: {
                            type: Scratch.ArgumentType.STRING,
                            defaultValue: 'name'
                        }
                    }
                },
                {
                    opcode: 'setArg',
                    blockType: Scratch.BlockType.COMMAND,
                    text: 'set hook argument [ARG] to [VALUE]',
                    tooltip: 'Modifies an argument passed into the hooked primitive before execution.',
                    arguments: {
                        ARG: {
                            type: Scratch.ArgumentType.STRING,
                            defaultValue: 'name'
                        },
                        VALUE: {
                            type: Scratch.ArgumentType.STRING,
                            defaultValue: 'value'
                        }
                    }
                },
                {
                    branchCount: 1,
                    opcode: 'hookBlock',
                    blockType: Scratch.BlockType.COMMAND,
                    text: 'hook [BLOCK]',
                    tooltip: 'Hooks into a primitive block and runs custom logic before/around it.',
                    arguments: {
                        BLOCK: {
                            type: Scratch.ArgumentType.STRING,
                            menu: 'primitiveMenu'
                        }
                    }
                },
                {
                    opcode: "thisBlock",
                    blockType: Scratch.BlockType.REPORTER,
                    text: "this block",
                    tooltip: "The original block info this hook is being ran on.",
                    disableMonitor: true
                },
                '---',
                {
                    opcode: 'getBlock',
                    blockType: Scratch.BlockType.REPORTER,
                    text: "get block by ID [ID] in [TARGET]",
                    tooltip: "Returns the JSON data for a block using its ID. The ID can come from a block output (like the 'this block' reporter) or the dev environment context menu option 'Copy Block ID'.",
                    arguments: {
                        ID: {
                            type: Scratch.ArgumentType.STRING,
                            defaultValue: 'Put ID Here.'
                        },
                        TARGET: {
                            type: Scratch.ArgumentType.STRING,
                            defaultValue: '_stage_',
                            menu: 'targetMenu2'
                        }
                    }
                },
                {
                    opcode: 'addBlock',
                    blockType: Scratch.BlockType.COMMAND,
                    text: "add block in [TARGET] defined as [BLOCK]",
                    tooltip: "Adds a block (by ID) into the mentioned target with the provided JSON data.",
                    arguments: {
                        TARGET: {
                            type: Scratch.ArgumentType.STRING,
                            defaultValue: '_stage_',
                            menu: 'targetMenu'
                        },
                        BLOCK: {
                            type: Scratch.ArgumentType.STRING,
                            defaultValue: `{"id":"GC0Z]NVW^?%}!ny-I0u5","opcode":"control_wait_until","inputs":{},"fields":{},"next":null,"topLevel":false,"parent":"WmU^kF$=A^y!zQc(D(TX","shadow":false,"x":-97.60497444058637,"y":96.79013474869579}`
                        }
                    }
                },
                {
                    opcode: 'removeBlock',
                    blockType: Scratch.BlockType.COMMAND,
                    text: 'remove block [ID] in [TARGET]',
                    tooltip: 'Removes a block by ID and repairs all references (next, parent, inputs, and running threads).',
                    arguments: {
                        ID: {
                            type: Scratch.ArgumentType.STRING,
                            defaultValue: 'Put ID Here.'
                        },
                        TARGET: {
                            type: Scratch.ArgumentType.STRING,
                            defaultValue: '_stage_',
                            menu: 'targetMenu'
                        }
                    }
                },
                {
                    opcode: 'mutateBlock',
                    blockType: Scratch.BlockType.COMMAND,
                    text: "mutate block [BLOCK] in [TARGET] in-place",
                    tooltip: "Modifies a block in place using its JSON data. The JSON must include a valid block ID.",
                    arguments: {
                        BLOCK: {
                            type: Scratch.ArgumentType.STRING,
                            defaultValue: `Mutation Info Here`
                        },

                        TARGET: {
                            type: Scratch.ArgumentType.STRING,
                            defaultValue: '_stage_',
                            menu: 'targetMenu'
                        }
                    }
                },
                '---',
                {
                    opcode: 'setTargetVar',
                    blockType: Scratch.BlockType.COMMAND,
                    text: 'set [TARGET] var [VAR] to [VALUE]',
                    tooltip: 'Sets a variable on a selected sprite or stage.',
                    arguments: {
                        TARGET: { type: Scratch.ArgumentType.STRING, defaultValue: '_stage_', menu: 'targetMenu' },
                        VAR: { type: Scratch.ArgumentType.STRING, defaultValue: 'score' },
                        VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: '100' }
                    }
                },
                {
                    opcode: 'lockTargetVar',
                    blockType: Scratch.BlockType.COMMAND,
                    text: 'lock [TARGET] var [VAR]',
                    tooltip: 'Locks a variable so it cannot be changed normally.',
                    arguments: {
                        TARGET: { type: Scratch.ArgumentType.STRING, defaultValue: '_stage_', menu: 'targetMenu' },
                        VAR: { type: Scratch.ArgumentType.STRING, defaultValue: 'score' }
                    }
                },
                {
                    opcode: 'unlockTargetVar',
                    blockType: Scratch.BlockType.COMMAND,
                    text: 'unlock [TARGET] var [VAR]',
                    tooltip: 'Removes protection and restores normal editing of a variable.',
                    arguments: {
                        TARGET: { type: Scratch.ArgumentType.STRING, defaultValue: '_stage_', menu: 'targetMenu' },
                        VAR: { type: Scratch.ArgumentType.STRING, defaultValue: 'score' }
                    }
                },
                {
                    opcode: 'runInSprite',
                    blockType: Scratch.BlockType.COMMAND,
                    text: 'run as [SPRITE]',
                    tooltip: 'Executes the following branch as another sprite or stage context.',
                    arguments: {
                        SPRITE: { type: Scratch.ArgumentType.STRING, defaultValue: '_stage_', menu: 'targetMenu' }
                    },
                    branchCount: 1
                }
            ],
            menus: {
                primitiveMenu: {
                    acceptReporters: false,
                    items: 'getAllPrimitiveOpcodes'
                },
                targetMenu: {
                    acceptReporters: true,
                    items: 'getAllTargets'
                },
                targetMenu2: {
                    acceptReporters: true,
                    items: 'getAllTargets2'
                },
                broadcastMenu: {
                    acceptReporters: true,
                    items: 'getAllBroadcasts'
                },
                proccodeMenu: {
                    acceptReporters: true,
                    items: 'getAllCustomBlocks'
                }
            }

        };
    }
    getBlock(args, util) {
        const id = args.ID;
        const targetType = args.TARGET;
        const target = this.resolveTarget(targetType);
        const blocks = Object.assign({}, ...(Array.isArray(target) ? target.map(e => e.blocks._blocks) : [target.blocks._blocks])); // Allow for global lookup if needed.

        return JSON.stringify(blocks[id]);
    }

    removeBlock(args, util) {
        const target = this.resolveTarget(args.TARGET);
        if (!target) return;

        const id = args.ID;
        if (!id) return;

        const blocks = target.blocks._blocks;
        const block = blocks[id];
        if (!block) return;

        // helper: get parent input reference (if any)
        function findParentInput(parentBlock, childId) {
            if (!parentBlock?.inputs) return null;

            for (const [name, input] of Object.entries(parentBlock.inputs)) {
                if (input?.block === childId) {
                    return { parentBlock, name, input };
                }
            }
            return null;
        }

        // 1. Fix NEXT chain (a -> X -> b becomes a -> b)
        for (const b of Object.values(blocks)) {
            if (!b) continue;

            if (b.next === id) {
                b.next = block.next || null;
            }
        }

        // 2. Fix PARENT chain + input stack healing
        for (const b of Object.values(blocks)) {
            if (!b) continue;

            if (b.parent === id) {
                // if removed block had a next, reattach child chain upward
                b.parent = block.parent || null;
            }

            // fix input references
            if (b.inputs) {
                for (const input of Object.values(b.inputs)) {
                    if (!input) continue;

                    if (input.block === id) {
                        // replace with removed block's next (inline chain healing)
                        input.block = null;
                    }
                    if (input.shadow === id) {
                        input.shadow = null;
                    }
                }
            }
        }

        // 3. Fix parent input slot that directly contained this block
        if (block.parent) {
            const parent = blocks[block.parent];
            const ref = findParentInput(parent, id);

            if (ref) {
                // replace removed block with its next sibling in that input slot
                ref.input.block = null;
            }
        }

        // 4. Remove block itself
        delete blocks[id];

        // 5. Optional: stop threads sitting on it
        for (const thread of vm.runtime.threads) {
            if (!thread.stack) continue;

            if (thread.stack.includes(id)) {
                vm.runtime._stopThread(thread);
            }
        }
    }
    mutateBlock(args, util) {
        const target = this.resolveTarget(args.TARGET);
        if (!target) return;

        let info;
        try {
            info = JSON.parse(args.BLOCK);
        } catch (e) {
            console.error("ERR: Invalid block JSON");
            return;
        }

        const id = info.id
        if (!id) {
            console.error("ERR: Missing block ID");
            return;
        }

        const existing = target.blocks._blocks[id];
        if (!existing) return;

        // ID sanity check
        if (info.id && info.id !== id) {
            console.error("ERR: Block ID mismatch");
            return;
        }

        // don't let payload override identity
        delete info.id;

        // simplest correct approach: merge into registry entry
        Object.assign(existing, info);
    }
    addBlock(args, util) {
        const block = JSON.parse(args.BLOCK);
        const targetType = args.TARGET;
        const target = this.resolveTarget(targetType);

        target.blocks.createBlock(block);
    }
    thisBlock(args, util) {
        return JSON.stringify(util.thread.ogBlockInfo);
    }
    setCustomArg(args, util) {
        const name = args.NAME;
        const value = args.VALUE;
        const frames = util.thread.stackFrames;
        let frame;


        for (let i = frames.length - 1; i > 0; i++) {
            const params = frames[i]?.params;
            if (params && Object.prototype.hasOwnProperty.call(params, name)) {
                frame = frames[i];
                break;
            }
        }

        if (frame) frame.params[name] = value;
    }
    getCustomArg(args, util) {
        return util.thread.getParam(args.NAME);
    }
    getAllCustomBlocks() {
        const arr = [];
        for (const target of vm.runtime.targets) {
            for (const block of Object.values(target.blocks._blocks)) {
                if (block.opcode === 'procedures_prototype') {
                    arr.push({ text: block?.mutation?.proccode, value: block.parent });
                }
            }
        }
        if (arr.length === 0) {
            arr.push('');
        }
        return arr;
    }
    getAllBroadcasts() {
        const seen = new Set();
        const result = [];

        const addMsgsFromTarget = (t) => {
            for (const variable of Object.values(t.variables)) {
                if (variable.type === 'broadcast_msg' && !seen.has(variable.id)) {
                    seen.add(variable.id);
                    result.push({
                        text: variable.name,
                        value: variable.id
                    });
                }
            }
        };

        addMsgsFromTarget(Scratch.vm.runtime.getTargetForStage());
        if (result.length === 0) {
            result.push({ text: 'No broadcasts...', value: '' });
        }

        return result;
    }
    getAllPrimitiveOpcodes() {
        return Object.keys(this.runtime._primitives)
            .filter(key => {
                const isFunc = typeof this.runtime._primitives[key] === 'function';
                const isNotSelf = !key.startsWith('cheatapi');
                return isNotSelf && isFunc
            })
            .sort()
            .map(name => ({
                text: name,
                value: name
            }));
    }
    getAllTargets() {
        return this.vm.runtime.targets.map(e => {
            const name = e.getName();
            const id = e.isStage ? '_stage_' : e.id;
            return { text: name, value: id };
        })
    }
    getAllTargets2() {
        return [
            { text: 'All', value: '_all_' },
            ...this.vm.runtime.targets.map(e => {
                const name = e.getName();
                const id = e.isStage ? '_stage_' : e.id;
                return { text: name, value: id };
            })
        ];
    }

    resolveTarget(targ) {
        if (targ == '_all_') {
            return vm.runtime.targets;
        } else if (targ == '_stage_') {
            return vm.runtime.getTargetForStage();
        } else if (vm.runtime.getTargetById(targ)) {
            return vm.runtime.getTargetById(targ);
        }
        return null;
    }
    resolveCustomBlock(inputValue) {
        for (const target of vm.runtime.targets) {
            for (const block of Object.values(target.blocks._blocks)) {
                if (
                    block.opcode === 'procedures_prototype' &&
                    block.parent === inputValue
                ) {
                    return block;
                }
            }
        }
        return null;
    }

    stopCustomBlocks(args, util) {
        const proto = this.resolveCustomBlock(args.PROCCODE); // Prototype with mutation.proccode
        if (!proto) {
            console.error("ERR: Error resolving prototype")
            console.info(proto);
            console.info(args.PROCCODE);
            return;
        }
        const def = args.PROCCODE; // Definition block ID
        console.info(def);
        const target = this.resolveTarget(args.TARGET);
        if (Array.isArray(target)) {
            console.log('Block cant be used on "ALL" targets')
            return;
        }

        for (const thread of vm.runtime.threads) {

            if (thread.target !== target || !thread.stack.find(e => thread.blockContainer._blocks[e]?.mutation?.proccode === proto.mutation.proccode)) {
                console.log('Thread does not include the definition.')
                continue;
            }

            const stack = thread.stack;
            const blocks = thread.blockContainer._blocks;
            console.log(stack);
            console.log(blocks);
            // Find the EARLIEST matching procedures_call
            let matchIndex = -1;
            for (let i = 0; i < stack.length; i++) {
                const block = blocks[stack[i]];
                console.log(block);
                if (
                    block?.opcode === 'procedures_call' &&
                    block?.mutation?.proccode === proto.mutation.proccode
                ) {
                    console.log("FoundCall!");
                    matchIndex = i;
                    break; // first match only
                }
            }
            console.log(matchIndex);
            if (matchIndex === -1) continue; // not found

            // Pop down to that block
            while (thread.stack.length > matchIndex + 1) {
                thread.popStack();
            }

            thread.goToNextBlock(); // skip that custom block
        }
    }

    stopSprite(args, util) {
        const targetOrList = this.resolveTarget(args.TARGET);
        if (Array.isArray(targetOrList)) {
            for (let target of targetOrList) {
                for (let thread of vm.runtime.threads) {
                    if (thread.target == target) {
                        vm.runtime._stopThread(thread);
                    }
                }
            }
        } else {
            const target = targetOrList;
            for (let thread of vm.runtime.threads) {
                if (thread.target == target) {
                    vm.runtime._stopThread(thread);
                }
            }
        }
    }
    runSprite(args, util) {
        const targetOrList = this.resolveTarget(args.TARGET);
        function runFlag(target) {
            util.startHats('event_whenflagclicked', null, target);
        }
        if (Array.isArray(targetOrList)) {
            for (let target of targetOrList) {
                runFlag(target);
            }
        } else {
            const target = targetOrList;
            runFlag(target);
        }
    }
    stopBroadcasts(args, util) {
        const threads = vm.runtime.threads;
        const blocks = new Set();
        const targetOrList = this.resolveTarget(args.TARGET);
        if (Array.isArray(targetOrList)) {
            for (let target of targetOrList) {
                for (let block of Object.values(target.blocks._blocks)) {
                    if (block.opcode === 'event_whenbroadcastreceived' && block.fields.BROADCAST_OPTION) {
                        if (block.fields.BROADCAST_OPTION.id === args.MESSAGE) {
                            blocks.add(block.id);
                        }
                    }
                }
            }
        } else {
            const target = targetOrList;
            for (let block of Object.values(target.blocks._blocks)) {
                if (block.opcode === 'event_whenbroadcastreceived' && block.fields.BROADCAST_OPTION) {
                    if (block.fields.BROADCAST_OPTION.id === args.MESSAGE) {
                        blocks.add(block.id);
                    }
                }
            }
        }
        for (let thread of threads) {
            if (blocks.has(thread.topBlock)) {
                vm.runtime._stopThread(thread);
            }
        }
    }
    thisTarget(args, util) {
        return JSON.stringify(util.thread.ogTarget || util.target || vm.editingTarget);
    }
    stopBlock(args, util) {
        util.thread.stopExecution = true;
    }
    returnBlock(args, util) {
        util.thread.primReturnVal = args.VALUE;
    }
    getArgs(args, util) {
        if (!util.thread.ogArgs) return '';
        return JSON.stringify(util.thread.ogArgs);
    }
    getArg(args, util) {
        if (!util.thread.ogArgs) return '';
        return typeof util.thread.ogArgs[args.ARG] == 'object' && util.thread.ogArgs[args.ARG] !== null ? JSON.stringify(util.thread.ogArgs[args.ARG]) : String(util.thread.ogArgs[args.ARG]);
    }
    setArg(args, util) {
        if (!util.thread.ogArgs) return null;
        util.thread.ogArgs[args.ARG] = args.VALUE;
    }
    setTargetVar(args, util) {
        const targetName = args.TARGET;
        const varName = args.VAR;
        const value = args.VALUE;

        const target = (targetName === "_stage_")
            ? this.runtime.getTargetForStage()
            : this.runtime.getSpriteTargetByName(targetName);

        if (!target || typeof target.lookupOrCreateVariable !== 'function') return;

        const variable = target.lookupOrCreateVariable(varName, varName);
        if (!variable) return;

        variable.value = value; // Will fail silently if locked
    }

    lockTargetVar(args, util) {
        const targetName = args.TARGET;
        const varName = args.VAR;

        const target = (targetName === "_stage_")
            ? this.runtime.getTargetForStage()
            : this.runtime.getSpriteTargetByName(targetName);

        if (!target || typeof target.lookupOrCreateVariable !== 'function') return;

        const variable = target.lookupOrCreateVariable(varName, varName);
        if (!variable) return;

        if (Object.getOwnPropertyDescriptor(variable, 'value')?.get) return;

        const actualValue = variable.value;
        Object.defineProperty(variable, "value", {
            get() {
                return actualValue;
            },
            set(v) {
                return v;
            },
            configurable: true
        });
    }

    unlockTargetVar(args, util) {
        const targetName = args.TARGET;
        const varName = args.VAR;

        const target = (targetName === "_stage_")
            ? this.runtime.getTargetForStage()
            : this.runtime.getSpriteTargetByName(targetName);

        if (!target || typeof target.lookupOrCreateVariable !== 'function') return;

        const variable = target.lookupOrCreateVariable(varName, varName);
        if (!variable) return;

        const currentValue = variable.value;
        delete variable.value;
        variable.value = currentValue;
    }
    getThisBlock(util, branch, optBranch) {
        if (branch) return util.thread.blockContainer.getBranch(util.thread.peekStack(), optBranch ? optBranch : 1);
        else return util.thread.blockContainer.getBlock(util.thread.peekStack());
    }
    hookBlock(args, util) {
        const target = util.target;
        const originalPrimitiveMaybe = vm.runtime._primitives[args.BLOCK];
        const originalPrimitive = originalPrimitiveMaybe.original ? originalPrimitiveMaybe.original : originalPrimitiveMaybe;
        if (!originalPrimitive) return "ERR: Block doesn't exist";

        const currentThread = util.thread;
        // Get the first branch block from the current block ( the hooked code branch)
        const branchBlock = currentThread.target.blocks.getBranch(currentThread.peekStack(), 1);
        if (!branchBlock) return "ERR: No branch to run";

        if (!this.hooks.has(originalPrimitive)) {
            this.hooks.set(originalPrimitive, []);
        }

        // Add current hook info: branchBlock and target where hook runs
        this.hooks.get(originalPrimitive).push({ branchBlock, target });

        if (vm.runtime._primitives[args.BLOCK].wrappered) return "Hook set";

        vm.runtime._primitives[args.BLOCK] = async (args2, util2) => {
            const hooks = this.hooks.get(originalPrimitive) || [];
            let stopExecutionRequested = false;
            let returnRequested = null;
            const target = util2.target;
            for (const { branchBlock: hookBranch, target: hookTarget } of hooks) {
                const thread = vm.runtime._pushThread(hookBranch, hookTarget);
                thread.ogArgs = args2;
                thread.ogTarget = target;
                thread.ogBlockInfo = target.blocks.getBlock(util2.thread.peekStack());
                // Wait until the hook thread finishes executing
                await new Promise((resolve) => {
                    const interval = setInterval(() => {
                        if (!vm.runtime.isActiveThread(thread)) {
                            if (thread.primReturnVal) {
                                returnRequested = thread.primReturnVal;
                            }
                            if (thread.stopExecution) {
                                // if we stopped execution, tell the parent thread so we dont rerun the hooked primitive's original function.
                                stopExecutionRequested = true;
                                clearInterval(interval);
                                resolve();
                                return;
                            }
                            clearInterval(interval);
                            resolve();
                        }
                    }, 1);
                });

                if (stopExecutionRequested) break; // Stop running further hooks if exit requested
            }

            if (stopExecutionRequested) {
                if (returnRequested) return returnRequested;
                return;
            } // Skip original primitive if any hook stopped execution

            // Call original primitive normally (supports async or sync)
            const result = originalPrimitive.call(vm.runtime._primitives, args2, util2);
            if (result instanceof Promise) {
                const final = await result;
                return returnRequested ? returnRequested : final;
            } else {
                return returnRequested ? returnRequested : result;
            }
        };

        vm.runtime._primitives[args.BLOCK].wrappered = true;
        vm.runtime._primitives[args.BLOCK].original = originalPrimitive;
        return "Hook set";
    }


    async runInSprite(args, util) {
        const runtime = this.runtime;
        const currentThread = util.thread;
        const currentTarget = currentThread.ogTarget || util.target;

        const branch = currentThread.ogTarget
            ? currentThread.ogTarget.blocks.getBranch(currentThread.peekStack(), 1)
            : this.getThisBlock(util, true, 1);
        console.log(branch);
        window.util = util;
        console.log(currentThread);
        console.log(currentTarget);
        if (!branch) return;

        const name = args.SPRITE;
        let newTarget = (name === "_stage_")
            ? runtime.getTargetForStage()
            : runtime.getTargetById(name);

        let targets = runtime.targets;
        let thread;

        if (name.startsWith("_all_")) {
            if (name.includes("2")) {
                targets = targets.filter(t => t.isOriginal);
            } else if (name.includes("3")) {
                targets = targets.filter(t => !t.isOriginal);
            }

            newTarget = targets[0];
        }

        if (newTarget) {
            thread = this.pushThreadTarget(branch, newTarget, currentTarget, false);
            this.addMissKeys(currentThread, thread);
        }

        if (name.startsWith("_all_")) {
            for (const target of targets) {
                const t = this.pushThreadTarget(branch, target, currentTarget, false);
                this.addMissKeys(currentThread, t);
            }
        }
        window.t = thread;
        if (thread) {
            await new Promise(resolve => {
                const interval = setInterval(() => {
                    if (!runtime.isActiveThread(thread)) {
                        clearInterval(interval);
                        resolve();
                    }
                }, 1);
            });
        }
    }
    pushThreadTarget(id, newTarget, oldTarget, stackClick) {
const thread = this.runtime._pushThread(id, newTarget, { stackClick });
thread.ogTarget = oldTarget;
thread.blockContainer = newTarget.blocks;
        return thread;
    }

    addMissKeys(oldThread, newThread) {
        newThread.updateMonitor = oldThread.updateMonitor;
        newThread.status = oldThread.status;
    }
}

Scratch.extensions.register(new CheatAPI(vm, vm.runtime));
