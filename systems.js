// SURVIVAL QUEST - Sistemas de Juego: Vitals, Inventario, Fabricación, Misiones y Guardado
// Implementación directa del Marco Teórico (Secciones 4.2, 4.6, 4.7 y Anexo B/C)

// Catálogo de Ítems del Videojuego
const ITEM_DEFINITIONS = {
    wood: { id: 'wood', name: 'Madera', icon: '🪵', category: 'resource', maxStack: 50, desc: 'Madera resistente recolectada de árboles. Esencial para fabricar herramientas y refugios.' },
    stone: { id: 'stone', name: 'Piedra', icon: '🪨', category: 'resource', maxStack: 50, desc: 'Piedra sólida extraída de rocas y canteras. Útil para herramientas duras y fogatas.' },
    stick: { id: 'stick', name: 'Rama Fina', icon: '🥢', category: 'resource', maxStack: 50, desc: 'Ramas flexibles para mangos de herramientas y antorchas.' },
    fiber: { id: 'fiber', name: 'Fibra Vegetal', icon: '🌾', category: 'resource', maxStack: 50, desc: 'Fibras secas para amarrar herramientas y elaborar cuerdas.' },
    flint: { id: 'flint', name: 'Pedernal', icon: '🔪', category: 'resource', maxStack: 30, desc: 'Piedra afilada capaz de generar chispas para el fuego y puntas de lanza.' },
    berries: { id: 'berries', name: 'Bayas Silvestres', icon: '🫐', category: 'food', maxStack: 30, desc: 'Frutos dulces del bosque. Restaura +18 de Hambre y +5 de Sed.', hunger: 18, thirst: 5, health: 4 },
    meat_raw: { id: 'meat_raw', name: 'Carne Cruda', icon: '🥩', category: 'food', maxStack: 20, desc: 'Carne fresca de animal. Es mejor cocinarla en una fogata para evitar enfermedades.', hunger: 15, health: -8 },
    meat_cooked: { id: 'meat_cooked', name: 'Carne Asada', icon: '🍖', category: 'food', maxStack: 20, desc: 'Carne jugosa y nutritiva asada al fuego. Restaura +50 de Hambre y +20 de Salud.', hunger: 50, health: 20 },
    canteen: { id: 'canteen', name: 'Cantimplora de Agua', icon: '🍶', category: 'survival', maxStack: 1, desc: 'Contenedor de agua potable. Restaura +60 de Sed al beber.', thirst: 60 },
    stone_axe: { id: 'stone_axe', name: 'Hacha de Piedra', icon: '🪓', category: 'tool', maxStack: 1, toolType: 'axe', power: 2.5, desc: 'Herramienta eficiente para talar árboles el doble de rápido.' },
    stone_pickaxe: { id: 'stone_pickaxe', name: 'Pico de Piedra', icon: '⛏️', category: 'tool', maxStack: 1, toolType: 'pickaxe', power: 2.5, desc: 'Herramienta para romper rocas rápidamente y conseguir pedernal.' },
    spear: { id: 'spear', name: 'Lanza de Caza', icon: '🗡️', category: 'weapon', maxStack: 1, power: 3.5, desc: 'Arma de largo alcance para cazar presas y defenderse de lobos.' },
    torch: { id: 'torch', name: 'Antorcha', icon: '🔥', category: 'survival', maxStack: 5, desc: 'Ilumina tu alrededor durante la noche y ahuyenta depredadores.' },
    item_campfire: { id: 'item_campfire', name: 'Kit de Fogata', icon: '🏕️', category: 'building', maxStack: 5, placeable: 'campfire', desc: 'Permite colocar una fogata para cocinar, calentarse e iluminar.' },
    item_shelter: { id: 'item_shelter', name: 'Kit de Refugio', icon: '🛖', category: 'building', maxStack: 2, placeable: 'shelter', desc: 'Crea una choza de madera para dormir toda la noche y guardar partida.' },
    item_chest: { id: 'item_chest', name: 'Cofre de Almacén', icon: '📦', category: 'building', maxStack: 5, placeable: 'chest', desc: 'Cofre para almacenar recursos adicionales en tu campamento.' }
};

// Recetas de Fabricación (Crafting)
const CRAFTING_RECIPES = [
    {
        id: 'craft_axe',
        resultId: 'stone_axe',
        count: 1,
        category: 'tools',
        name: 'Hacha de Piedra',
        icon: '🪓',
        materials: [
            { id: 'wood', count: 4 },
            { id: 'stone', count: 3 }
        ]
    },
    {
        id: 'craft_pickaxe',
        resultId: 'stone_pickaxe',
        count: 1,
        category: 'tools',
        name: 'Pico de Piedra',
        icon: '⛏️',
        materials: [
            { id: 'wood', count: 4 },
            { id: 'stone', count: 5 }
        ]
    },
    {
        id: 'craft_spear',
        resultId: 'spear',
        count: 1,
        category: 'tools',
        name: 'Lanza de Caza',
        icon: '🗡️',
        materials: [
            { id: 'wood', count: 5 },
            { id: 'stone', count: 2 },
            { id: 'fiber', count: 2 }
        ]
    },
    {
        id: 'craft_torch',
        resultId: 'torch',
        count: 2,
        category: 'survival',
        name: 'Antorchas (x2)',
        icon: '🔥',
        materials: [
            { id: 'wood', count: 2 },
            { id: 'fiber', count: 2 }
        ]
    },
    {
        id: 'craft_canteen',
        resultId: 'canteen',
        count: 1,
        category: 'survival',
        name: 'Cantimplora',
        icon: '🍶',
        materials: [
            { id: 'fiber', count: 4 },
            { id: 'wood', count: 2 }
        ]
    },
    {
        id: 'craft_campfire',
        resultId: 'item_campfire',
        count: 1,
        category: 'building',
        name: 'Kit de Fogata',
        icon: '🏕️',
        materials: [
            { id: 'wood', count: 6 },
            { id: 'stone', count: 6 }
        ]
    },
    {
        id: 'craft_shelter',
        resultId: 'item_shelter',
        count: 1,
        category: 'building',
        name: 'Kit de Refugio de Madera',
        icon: '🛖',
        materials: [
            { id: 'wood', count: 14 },
            { id: 'stone', count: 6 },
            { id: 'fiber', count: 5 }
        ]
    },
    {
        id: 'craft_chest',
        resultId: 'item_chest',
        count: 1,
        category: 'building',
        name: 'Cofre de Almacén',
        icon: '📦',
        materials: [
            { id: 'wood', count: 10 }
        ]
    },
    {
        id: 'craft_cooked_meat',
        resultId: 'meat_cooked',
        count: 1,
        category: 'food',
        name: 'Asar Carne en Fuego',
        icon: '🍖',
        requiresNearbyCampfire: true,
        materials: [
            { id: 'meat_raw', count: 1 }
        ]
    }
];

// Sistema de Necesidades Vitales (Vitals)
class VitalsManager {
    constructor() {
        this.health = 100;
        this.maxHealth = 100;
        this.hunger = 100;
        this.maxHunger = 100;
        this.thirst = 100;
        this.maxThirst = 100;
        this.energy = 100;
        this.maxEnergy = 100;

        // Tasas de consumo por segundo
        this.hungerRate = 0.22;  // Disminuye en aprox ~7 minutos
        this.thirstRate = 0.38;  // Disminuye en aprox ~4.5 minutos
        this.energyRecovery = 8; // Recuperación pasiva al descansar
    }

    update(dt, isSprinting, isMoving) {
        // Consumo de Hambre y Sed en el tiempo
        this.hunger = Math.max(0, this.hunger - this.hungerRate * dt);
        this.thirst = Math.max(0, this.thirst - this.thirstRate * dt);

        // Si no está corriendo, recupera energía gradualmente
        if (!isSprinting) {
            const recoveryBonus = isMoving ? 0.5 : 1.0;
            this.energy = Math.min(this.maxEnergy, this.energy + this.energyRecovery * recoveryBonus * dt);
        }

        // Penalizaciones por inanición y deshidratación extrema
        if (this.thirst <= 0) {
            this.health = Math.max(0, this.health - 2.5 * dt);
        }
        if (this.hunger <= 0) {
            this.health = Math.max(0, this.health - 1.8 * dt);
        }

        // Regeneración lenta de salud si hambre y sed están arriba del 80%
        if (this.hunger > 80 && this.thirst > 80 && this.health < this.maxHealth) {
            this.health = Math.min(this.maxHealth, this.health + 1.2 * dt);
        }

        // Actualizar UI del HUD
        this.updateHUD();
    }

    consumeEnergy(amount) {
        this.energy = Math.max(0, this.energy - amount);
        this.updateHUD();
    }

    consumeHunger(amount) {
        this.hunger = Math.max(0, this.hunger - amount);
        this.updateHUD();
    }

    damage(amount) {
        this.health = Math.max(0, this.health - amount);
        this.updateHUD();
    }

    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
        this.updateHUD();
    }

    feed(amount) {
        this.hunger = Math.min(this.maxHunger, this.hunger + amount);
        this.updateHUD();
    }

    hydrate(amount) {
        this.thirst = Math.min(this.maxThirst, this.thirst + amount);
        this.updateHUD();
    }

    restFull() {
        this.energy = this.maxEnergy;
        this.heal(30);
        this.consumeHunger(15);
        this.consumeThirst(20);
        this.updateHUD();
    }

    updateHUD() {
        const barH = document.getElementById('bar-health');
        const barHu = document.getElementById('bar-hunger');
        const barT = document.getElementById('bar-thirst');
        const barE = document.getElementById('bar-energy');

        if (barH) barH.style.width = `${(this.health / this.maxHealth) * 100}%`;
        if (barHu) barHu.style.width = `${(this.hunger / this.maxHunger) * 100}%`;
        if (barT) barT.style.width = `${(this.thirst / this.maxThirst) * 100}%`;
        if (barE) barE.style.width = `${(this.energy / this.maxEnergy) * 100}%`;

        const txtH = document.getElementById('text-health');
        const txtHu = document.getElementById('text-hunger');
        const txtT = document.getElementById('text-thirst');
        const txtE = document.getElementById('text-energy');

        if (txtH) txtH.innerText = `${Math.ceil(this.health)} / 100`;
        if (txtHu) txtHu.innerText = `${Math.ceil(this.hunger)} / 100`;
        if (txtT) txtT.innerText = `${Math.ceil(this.thirst)} / 100`;
        if (txtE) txtE.innerText = `${Math.ceil(this.energy)} / 100`;
    }
}

// Sistema de Inventario
class InventoryManager {
    constructor(slotCount = 24) {
        this.slotCount = slotCount;
        this.slots = new Array(slotCount).fill(null);
        this.selectedHotbarIndex = 0; // 0..7

        // Inicializar con recursos básicos para empezar
        this.slots[0] = { id: 'wood', count: 2 };
        this.slots[1] = { id: 'berries', count: 4 };
    }

    getItemName(itemId) {
        return ITEM_DEFINITIONS[itemId] ? ITEM_DEFINITIONS[itemId].name : itemId;
    }

    getItemIcon(itemId) {
        return ITEM_DEFINITIONS[itemId] ? ITEM_DEFINITIONS[itemId].icon : '📦';
    }

    getActiveItem() {
        return this.slots[this.selectedHotbarIndex];
    }

    countItem(itemId) {
        let total = 0;
        for (const slot of this.slots) {
            if (slot && slot.id === itemId) {
                total += slot.count;
            }
        }
        return total;
    }

    hasMaterials(recipeMaterials) {
        for (const mat of recipeMaterials) {
            if (this.countItem(mat.id) < mat.count) {
                return false;
            }
        }
        return true;
    }

    consumeMaterials(recipeMaterials) {
        for (const mat of recipeMaterials) {
            let needed = mat.count;
            for (let i = 0; i < this.slotCount; i++) {
                if (this.slots[i] && this.slots[i].id === mat.id) {
                    if (this.slots[i].count <= needed) {
                        needed -= this.slots[i].count;
                        this.slots[i] = null;
                    } else {
                        this.slots[i].count -= needed;
                        needed = 0;
                    }
                    if (needed <= 0) break;
                }
            }
        }
        this.renderAll();
    }

    addItem(itemId, count = 1) {
        const def = ITEM_DEFINITIONS[itemId];
        if (!def) return false;

        // Intentar apilar en ranuras existentes
        for (let i = 0; i < this.slotCount; i++) {
            if (this.slots[i] && this.slots[i].id === itemId) {
                const space = def.maxStack - this.slots[i].count;
                if (space > 0) {
                    const toAdd = Math.min(space, count);
                    this.slots[i].count += toAdd;
                    count -= toAdd;
                    if (count <= 0) {
                        this.renderAll();
                        return true;
                    }
                }
            }
        }

        // Si sobran, colocar en primera ranura vacía
        while (count > 0) {
            const emptyIdx = this.slots.findIndex(s => s === null);
            if (emptyIdx === -1) {
                // Mochila llena
                systems.notify('¡Inventario lleno!', 'warning');
                return false;
            }
            const toAdd = Math.min(def.maxStack, count);
            this.slots[emptyIdx] = { id: itemId, count: toAdd };
            count -= toAdd;
        }

        this.renderAll();
        return true;
    }

    useItem(slotIndex) {
        const item = this.slots[slotIndex];
        if (!item) return;

        const def = ITEM_DEFINITIONS[item.id];
        if (!def) return;

        // Si es comida o bebida
        if (def.hunger || def.thirst || def.health) {
            if (def.hunger) systems.vitals.feed(def.hunger);
            if (def.thirst) systems.vitals.hydrate(def.thirst);
            if (def.health) {
                if (def.health > 0) systems.vitals.heal(def.health);
                else systems.vitals.damage(-def.health);
            }

            if (item.id === 'canteen') {
                Sounds.playDrink();
                systems.notify(`Bebiste de la cantimplora (+60 Sed)`, 'success');
            } else {
                Sounds.playEat();
                systems.notify(`Consumiste ${def.name}`, 'success');
            }

            item.count -= 1;
            if (item.count <= 0) {
                this.slots[slotIndex] = null;
            }
            this.renderAll();
        } else if (def.placeable) {
            // Activar modo de construcción para colocar en el mapa
            systems.building.startPlacement(def.placeable, slotIndex);
            systems.closeModals();
        }
    }

    renderHotbar() {
        const container = document.getElementById('hotbar-slots');
        if (!container) return;
        container.innerHTML = '';

        for (let i = 0; i < 8; i++) {
            const slot = this.slots[i];
            const div = document.createElement('div');
            div.className = `hotbar-slot ${i === this.selectedHotbarIndex ? 'active' : ''}`;
            div.dataset.index = i;

            const key = document.createElement('span');
            key.className = 'slot-key';
            key.innerText = (i + 1);
            div.appendChild(key);

            if (slot) {
                const icon = document.createElement('span');
                icon.className = 'slot-icon';
                icon.innerText = this.getItemIcon(slot.id);
                div.appendChild(icon);

                if (slot.count > 1) {
                    const count = document.createElement('span');
                    count.className = 'slot-count';
                    count.innerText = slot.count;
                    div.appendChild(count);
                }
            }

            div.onclick = () => {
                this.selectedHotbarIndex = i;
                this.renderHotbar();
            };

            container.appendChild(div);
        }
    }

    renderInventoryGrid() {
        const grid = document.getElementById('inventory-grid');
        if (!grid) return;
        grid.innerHTML = '';

        for (let i = 0; i < this.slotCount; i++) {
            const slot = this.slots[i];
            const div = document.createElement('div');
            div.className = 'inv-slot';
            div.dataset.index = i;

            if (slot) {
                const icon = document.createElement('span');
                icon.className = 'slot-icon';
                icon.innerText = this.getItemIcon(slot.id);
                div.appendChild(icon);

                if (slot.count > 1) {
                    const count = document.createElement('span');
                    count.className = 'slot-count';
                    count.innerText = slot.count;
                    div.appendChild(count);
                }
            }

            div.onclick = () => {
                document.querySelectorAll('.inv-slot').forEach(s => s.classList.remove('selected'));
                div.classList.add('selected');
                this.showItemDetails(i);
            };

            grid.appendChild(div);
        }
    }

    showItemDetails(slotIndex) {
        const panel = document.getElementById('item-details-panel');
        const item = this.slots[slotIndex];

        if (!item) {
            panel.innerHTML = '<div class="empty-details">Ranura vacía</div>';
            return;
        }

        const def = ITEM_DEFINITIONS[item.id];
        let actionBtn = '';
        if (def.hunger || def.thirst) {
            actionBtn = `<button class="hud-btn btn-primary" onclick="systems.inventory.useItem(${slotIndex})">Consumir</button>`;
        } else if (def.placeable) {
            actionBtn = `<button class="hud-btn btn-primary" onclick="systems.inventory.useItem(${slotIndex})">Colocar en el mapa</button>`;
        }

        panel.innerHTML = `
            <div class="item-details-content">
                <h3>${def.icon} ${def.name}</h3>
                <span class="item-badge">${def.category.toUpperCase()}</span>
                <p class="item-desc">${def.desc}</p>
                <div class="item-stats-list">
                    <p>Cantidad en ranura: ${item.count} / ${def.maxStack}</p>
                </div>
            </div>
            <div class="item-actions-box">
                ${actionBtn}
                <button class="hud-btn btn-danger" onclick="systems.inventory.dropItem(${slotIndex})">Soltar al suelo</button>
            </div>
        `;
    }

    dropItem(slotIndex) {
        const item = this.slots[slotIndex];
        if (!item) return;

        world.spawnDrop(item.id, game.player.x + 20, game.player.y + 20, item.count);
        this.slots[slotIndex] = null;
        this.renderAll();
        document.getElementById('item-details-panel').innerHTML = '<div class="empty-details">Objeto soltado</div>';
    }

    renderAll() {
        this.renderHotbar();
        this.renderInventoryGrid();
    }
}

// Sistema de Construcción y Colocación de Estructuras
class BuildingManager {
    constructor() {
        this.isPlacing = false;
        this.structureType = null;
        this.sourceSlotIndex = null;
        this.previewX = 0;
        this.previewY = 0;
    }

    startPlacement(structureType, slotIndex) {
        this.isPlacing = true;
        this.structureType = structureType;
        this.sourceSlotIndex = slotIndex;
        systems.notify(`Modo Construcción: Clic para colocar ${structureType === 'campfire' ? 'Fogata' : 'Refugio'}`, 'warning');
    }

    cancelPlacement() {
        this.isPlacing = false;
        this.structureType = null;
        this.sourceSlotIndex = null;
    }

    updatePreview(worldX, worldY) {
        if (!this.isPlacing) return;
        this.previewX = worldX;
        this.previewY = worldY;
    }

    confirmPlacement(worldX, worldY, world) {
        if (!this.isPlacing) return false;

        const radius = (this.structureType === 'shelter') ? 34 : 20;

        // Comprobar que no choque contra árboles, piedras o agua
        if (world.isBlocked(worldX, worldY, radius)) {
            systems.notify('¡No puedes construir sobre agua o rocas!', 'danger');
            return false;
        }

        // Agregar la estructura al mundo
        world.structures.push({
            id: Date.now(),
            type: this.structureType,
            x: worldX,
            y: worldY,
            radius: radius,
            solid: (this.structureType === 'shelter' || this.structureType === 'chest')
        });

        Sounds.playBuild();
        systems.notify(`¡Estructura colocada con éxito!`, 'success');

        // Consumir el kit de construcción del inventario
        if (this.sourceSlotIndex !== null && systems.inventory.slots[this.sourceSlotIndex]) {
            systems.inventory.slots[this.sourceSlotIndex].count -= 1;
            if (systems.inventory.slots[this.sourceSlotIndex].count <= 0) {
                systems.inventory.slots[this.sourceSlotIndex] = null;
            }
            systems.inventory.renderAll();
        }

        // Chequear misiones
        systems.quests.checkProgress('build', this.structureType, 1);

        this.cancelPlacement();
        return true;
    }

    renderGhostPreview(ctx, camX, camY, world) {
        if (!this.isPlacing) return;

        const sx = this.previewX - camX;
        const sy = this.previewY - camY;
        const radius = (this.structureType === 'shelter') ? 34 : 20;
        const valid = !world.isBlocked(this.previewX, this.previewY, radius);

        ctx.save();
        ctx.fillStyle = valid ? 'rgba(72, 187, 120, 0.4)' : 'rgba(229, 62, 62, 0.4)';
        ctx.strokeStyle = valid ? '#48bb78' : '#e53e3e';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.arc(sx, sy, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.structureType === 'campfire' ? '🏕️' : '🛖', sx, sy);
        ctx.restore();
    }
}

// Sistema de Misiones de Supervivencia (Survival Quests)
class QuestManager {
    constructor() {
        this.quests = [
            {
                id: 'q1',
                title: 'Primeros Pasos en la Naturaleza',
                desc: 'Explora los alrededores y recolecta madera de árboles y piedras para tus primeras herramientas.',
                tasks: [
                    { id: 'wood', text: 'Recolectar Madera (x5)', type: 'collect', target: 'wood', required: 5, current: 0 },
                    { id: 'stone', text: 'Recolectar Piedra (x3)', type: 'collect', target: 'stone', required: 3, current: 0 },
                    { id: 'berries', text: 'Recolectar Bayas (x2)', type: 'collect', target: 'berries', required: 2, current: 0 }
                ]
            },
            {
                id: 'q2',
                title: 'Herramientas de Supervivencia',
                desc: 'Abre el taller de fabricación [Tecla C] y fabrica tu primera hacha y pico de piedra.',
                tasks: [
                    { id: 'craft_axe', text: 'Fabricar Hacha de Piedra', type: 'craft', target: 'stone_axe', required: 1, current: 0 },
                    { id: 'craft_pickaxe', text: 'Fabricar Pico de Piedra', type: 'craft', target: 'stone_pickaxe', required: 1, current: 0 }
                ]
            },
            {
                id: 'q3',
                title: 'Fuente Vital de Agua',
                desc: 'Tu sed aumenta. Camina hacia el río azul en el mapa y presiona [E] para beber agua fresca.',
                tasks: [
                    { id: 'drink_river', text: 'Beber agua dulce del río', type: 'drink', target: 'river', required: 1, current: 0 }
                ]
            },
            {
                id: 'q4',
                title: 'Fuego Protector',
                desc: 'La noche en el bosque es oscura y fría. Fabrica un Kit de Fogata y colócalo en el terreno.',
                tasks: [
                    { id: 'build_fire', text: 'Construir una Fogata', type: 'build', target: 'campfire', required: 1, current: 0 }
                ]
            },
            {
                id: 'q5',
                title: 'Un Refugio Seguro',
                desc: 'Construye una Choza de Madera para pasar la noche a salvo de los lobos y recuperar energías.',
                tasks: [
                    { id: 'build_shelter', text: 'Construir un Refugio de Madera', type: 'build', target: 'shelter', required: 1, current: 0 }
                ]
            },
            {
                id: 'q6',
                title: 'Cazador del Bosque',
                desc: 'Fabrica una Lanza de Caza, persigue un conejo o ciervo y asa su carne en la fogata.',
                tasks: [
                    { id: 'hunt_animal', text: 'Cazar una presa silvestre', type: 'hunt', target: 'any', required: 1, current: 0 },
                    { id: 'cook_meat', text: 'Cocinar carne en la fogata', type: 'craft', target: 'meat_cooked', required: 1, current: 0 }
                ]
            },
            {
                id: 'q7',
                title: 'Superviviente Experto',
                desc: '¡Has dominado los elementos! Sobrevive 3 días completos en la naturaleza silvestre.',
                tasks: [
                    { id: 'survive_days', text: 'Sobrevivir 3 días', type: 'days', target: 3, required: 3, current: 0 }
                ]
            }
        ];

        this.currentQuestIndex = 0;
    }

    getCurrentQuest() {
        return this.quests[this.currentQuestIndex];
    }

    checkProgress(actionType, target, amount = 1) {
        const quest = this.getCurrentQuest();
        if (!quest) return;

        let changed = false;
        for (const task of quest.tasks) {
            if (task.type === actionType) {
                if (task.target === 'any' || task.target === target) {
                    if (task.current < task.required) {
                        task.current = Math.min(task.required, task.current + amount);
                        changed = true;
                    }
                }
            }
        }

        if (changed) {
            this.updateHUD();
            // Comprobar si completó la misión entera
            const allDone = quest.tasks.every(t => t.current >= t.required);
            if (allDone) {
                Sounds.playQuestComplete();
                systems.notify(`¡Misión Completada: ${quest.title}!`, 'success');
                this.currentQuestIndex++;
                if (this.currentQuestIndex < this.quests.length) {
                    const nextQ = this.getCurrentQuest();
                    systems.notify(`Nueva Misión: ${nextQ.title}`, 'warning');
                } else {
                    systems.notify('¡Felicidades! Has completado todas las misiones de SURVIVAL QUEST.', 'success');
                }
                this.updateHUD();
            }
        }
    }

    updateHUD() {
        const quest = this.getCurrentQuest();
        const tracker = document.getElementById('quest-tracker');
        if (!tracker) return;

        if (!quest) {
            document.getElementById('quest-name').innerText = '¡Misiones Completadas!';
            document.getElementById('quest-desc').innerText = 'Has conquistado la supervivencia en la naturaleza.';
            document.getElementById('quest-tasks-list').innerHTML = '';
            document.getElementById('quest-progress-fill').style.width = '100%';
            document.getElementById('quest-progress-text').innerText = 'Maestro de la Supervivencia';
            return;
        }

        document.getElementById('quest-name').innerText = quest.title;
        document.getElementById('quest-desc').innerText = quest.desc;

        const tasksList = document.getElementById('quest-tasks-list');
        tasksList.innerHTML = '';

        let completedCount = 0;
        for (const task of quest.tasks) {
            const isDone = task.current >= task.required;
            if (isDone) completedCount++;

            const item = document.createElement('div');
            item.className = `quest-task-item ${isDone ? 'completed' : ''}`;
            item.innerHTML = `<span>${isDone ? '✅' : '⚪'}</span> <span>${task.text} (${task.current}/${task.required})</span>`;
            tasksList.appendChild(item);
        }

        const pct = (completedCount / quest.tasks.length) * 100;
        document.getElementById('quest-progress-fill').style.width = `${pct}%`;
        document.getElementById('quest-progress-text').innerText = `${completedCount} / ${quest.tasks.length} Objetivos`;
    }
}

// Objeto Central de Sistemas
const systems = {
    vitals: new VitalsManager(),
    inventory: new InventoryManager(24),
    building: new BuildingManager(),
    quests: new QuestManager(),

    notify(text, type = 'info') {
        const zone = document.getElementById('notification-zone');
        if (!zone) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        let icon = 'ℹ️';
        if (type === 'success') icon = '⭐';
        if (type === 'danger') icon = '⚠️';
        if (type === 'warning') icon = '🔔';

        toast.innerHTML = `<span>${icon}</span> <span>${text}</span>`;
        zone.appendChild(toast);

        setTimeout(() => {
            toast.style.transition = 'opacity 0.4s, transform 0.4s';
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-20px)';
            setTimeout(() => toast.remove(), 400);
        }, 3200);
    },

    closeModals() {
        document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    },

    // Generar JSON conforme al Diccionario de Datos del Anexo B y C
    generateDatabaseSnapshot() {
        return {
            partida: {
                id_partida: 1,
                nombre_juego: "SURVIVAL QUEST",
                fecha_guardado: new Date().toISOString(),
                dia_actual: game.dayCount,
                tiempo_dia: Math.floor(game.timeOfDay),
                fase: game.isNight ? "Noche" : "Día"
            },
            jugador: {
                id_jugador: 1,
                nombre: "Explorador",
                salud: Math.round(this.vitals.health),
                hambre: Math.round(this.vitals.hunger),
                sed: Math.round(this.vitals.thirst),
                energia: Math.round(this.vitals.energy),
                posicion_x: Math.round(game.player.x),
                posicion_y: Math.round(game.player.y)
            },
            inventario: this.inventory.slots.map((s, idx) => ({
                ranura: idx,
                id_objeto: s ? s.id : null,
                nombre: s ? this.inventory.getItemName(s.id) : "Vacío",
                cantidad: s ? s.count : 0
            })).filter(s => s.id_objeto !== null),
            estructuras: world.structures.map(st => ({
                id_estructura: st.id,
                tipo: st.type,
                posicion_x: Math.round(st.x),
                posicion_y: Math.round(st.y)
            }))
        };
    },

    saveGame() {
        const data = this.generateDatabaseSnapshot();
        try {
            localStorage.setItem('survival_quest_save', JSON.stringify(data));
            this.notify('¡Partida guardada exitosamente en memoria local!', 'success');
        } catch (e) {
            console.error(e);
            this.notify('Error al guardar partida localmente.', 'danger');
        }
    },

    loadGame() {
        try {
            const raw = localStorage.getItem('survival_quest_save');
            if (!raw) return false;
            const data = JSON.parse(raw);

            // Cargar Vitals
            this.vitals.health = data.jugador.salud;
            this.vitals.hunger = data.jugador.hambre;
            this.vitals.thirst = data.jugador.sed;
            this.vitals.energy = data.jugador.energia;
            game.player.x = data.jugador.posicion_x;
            game.player.y = data.jugador.posicion_y;

            // Cargar Día
            game.dayCount = data.partida.dia_actual || 1;
            game.timeOfDay = data.partida.tiempo_dia || 0.25;

            // Cargar Inventario
            this.inventory.slots.fill(null);
            for (const item of data.inventario) {
                if (item.ranura < this.inventory.slotCount) {
                    this.inventory.slots[item.ranura] = { id: item.id_objeto, count: item.cantidad };
                }
            }

            // Cargar Estructuras
            if (data.estructuras) {
                world.structures = data.estructuras.map(st => ({
                    id: st.id_estructura,
                    type: st.tipo,
                    x: st.posicion_x,
                    y: st.posicion_y,
                    radius: st.tipo === 'shelter' ? 34 : 20,
                    solid: (st.tipo === 'shelter' || st.tipo === 'chest')
                }));
            }

            this.vitals.updateHUD();
            this.inventory.renderAll();
            this.notify('¡Partida cargada exitosamente!', 'success');
            return true;
        } catch (e) {
            console.error("Error al cargar partida:", e);
            return false;
        }
    }
};
