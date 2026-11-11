// SURVIVAL QUEST - Motor Principal y Bucle de Juego (Game Loop)
// Conforme a la Arquitectura Godot/GDScript en la Sección 4.3, 4.4 y Anexos

class GameEngine {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        this.lightCanvas = document.getElementById('light-canvas');
        this.lightCtx = this.lightCanvas.getContext('2d');

        // Estado del juego
        this.isRunning = false;
        this.isPaused = false;
        this.dayCount = 1;
        this.timeOfDay = 0.28; // 0.0 = medianoche, 0.25 = 06:00 (amanecer), 0.5 = 12:00 (mediodía), 0.75 = 18:00 (atardecer), 0.85 = 20:00+ (noche)
        this.daySpeed = 1 / 180; // Un día completo dura 3 minutos (180 segundos)
        this.isNight = false;

        // Cámara
        this.camera = { x: 0, y: 0, width: 0, height: 0, targetX: 0, targetY: 0 };

        // Entrada del usuario (Teclas y Ratón)
        this.input = {
            up: false,
            down: false,
            left: false,
            right: false,
            sprint: false,
            interact: false,
            use: false,
            mouseX: 0,
            mouseY: 0,
            worldMouseX: 0,
            worldMouseY: 0
        };

        // Entidades del mundo
        this.player = null;
        this.animals = [];
        this.wolves = [];
        this.wolfSpawnTimer = 0;

        // Último tiempo de frame
        this.lastTime = 0;

        // Auto-guardado cada 60 segundos
        this.autoSaveTimer = 60;
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Generar Mundo Natural (Sección 4.5)
        world = new GameWorld();
        world.generate(42);

        // Crear Jugador en posición inicial segura
        this.player = new Player(25 * TILE_SIZE, 35 * TILE_SIZE);
        this.camera.x = this.player.x - this.canvas.width / 2;
        this.camera.y = this.player.y - this.canvas.height / 2;

        // Poblar con animales silvestres (Conejos y Ciervos)
        for (let i = 0; i < 18; i++) {
            const rx = (10 + Math.random() * 60) * TILE_SIZE;
            const ry = (10 + Math.random() * 60) * TILE_SIZE;
            if (!world.isBlocked(rx, ry, 16)) {
                this.animals.push(new Animal(Math.random() < 0.6 ? 'rabbit' : 'deer', rx, ry));
            }
        }

        this.setupEventListeners();
        systems.inventory.renderAll();
        systems.quests.updateHUD();

        // Chequear si existe partida previa guardada
        if (localStorage.getItem('survival_quest_save')) {
            const btnContinue = document.getElementById('btn-continue-game');
            if (btnContinue) btnContinue.style.display = 'block';
        }
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.lightCanvas.width = window.innerWidth;
        this.lightCanvas.height = window.innerHeight;

        this.camera.width = this.canvas.width;
        this.camera.height = this.canvas.height;
    }

    start(loadSaved = false) {
        document.getElementById('main-menu').style.display = 'none';
        Sounds.init();

        if (loadSaved) {
            systems.loadGame();
        }

        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
        systems.notify('¡Bienvenido a SURVIVAL QUEST! Explora y sobrevive.', 'success');
    }

    setupEventListeners() {
        // Teclado
        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();

            // Atajos directos a paneles
            if (key === 'i' || key === 'tab') {
                e.preventDefault();
                this.toggleModal('modal-inventory');
                return;
            }
            if (key === 'c') {
                e.preventDefault();
                this.toggleModal('modal-crafting');
                return;
            }
            if (key === 'q') {
                e.preventDefault();
                const content = document.getElementById('quest-content');
                if (content) content.classList.toggle('hidden');
                return;
            }
            if (key === 'm') {
                e.preventDefault();
                this.toggleModal('modal-map');
                if (!document.getElementById('modal-map').classList.contains('hidden')) {
                    world.drawMinimap(document.getElementById('minimap-canvas'), this.player.x, this.player.y);
                }
                return;
            }
            if (key === 'escape') {
                e.preventDefault();
                this.toggleModal('modal-pause');
                return;
            }

            // Teclas de hotbar (1-8)
            const num = parseInt(key);
            if (num >= 1 && num <= 8) {
                systems.inventory.selectedHotbarIndex = num - 1;
                systems.inventory.renderHotbar();
                return;
            }

            // Movimiento
            if (key === 'w' || key === 'arrowup') this.input.up = true;
            if (key === 's' || key === 'arrowdown') this.input.down = true;
            if (key === 'a' || key === 'arrowleft') this.input.left = true;
            if (key === 'd' || key === 'arrowright') this.input.right = true;
            if (e.key === 'Shift') this.input.sprint = true;
            if (key === 'e') this.handleInteraction();
            if (key === ' ') {
                e.preventDefault();
                this.handleUseTool();
            }
        });

        window.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            if (key === 'w' || key === 'arrowup') this.input.up = false;
            if (key === 's' || key === 'arrowdown') this.input.down = false;
            if (key === 'a' || key === 'arrowleft') this.input.left = false;
            if (key === 'd' || key === 'arrowright') this.input.right = false;
            if (e.key === 'Shift') this.input.sprint = false;
        });

        // Ratón
        window.addEventListener('mousemove', (e) => {
            this.input.mouseX = e.clientX;
            this.input.mouseY = e.clientY;
            this.input.worldMouseX = e.clientX + this.camera.x;
            this.input.worldMouseY = e.clientY + this.camera.y;

            if (systems.building.isPlacing) {
                systems.building.updatePreview(this.input.worldMouseX, this.input.worldMouseY);
            }
        });

        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Clic izquierdo
                if (systems.building.isPlacing) {
                    systems.building.confirmPlacement(this.input.worldMouseX, this.input.worldMouseY, world);
                } else {
                    this.handleUseTool();
                }
            } else if (e.button === 2) { // Clic derecho
                if (systems.building.isPlacing) {
                    systems.building.cancelPlacement();
                    systems.notify('Construcción cancelada', 'info');
                }
            }
        });

        // Prevenir menú contextual en canvas
        this.canvas.addEventListener('contextmenu', e => e.preventDefault());

        // Botones de la interfaz HUD
        document.getElementById('btn-open-inventory').onclick = () => this.toggleModal('modal-inventory');
        document.getElementById('btn-open-crafting').onclick = () => {
            this.toggleModal('modal-crafting');
            this.setupCraftingUI();
        };
        document.getElementById('btn-open-map').onclick = () => {
            this.toggleModal('modal-map');
            world.drawMinimap(document.getElementById('minimap-canvas'), this.player.x, this.player.y);
        };
        document.getElementById('btn-open-pause').onclick = () => this.toggleModal('modal-pause');
        document.getElementById('btn-toggle-quest').onclick = () => {
            document.getElementById('quest-content').classList.toggle('hidden');
        };

        // Botones de Menús
        document.getElementById('btn-start-game').onclick = () => this.start(false);
        const btnCont = document.getElementById('btn-continue-game');
        if (btnCont) btnCont.onclick = () => this.start(true);

        document.getElementById('btn-resume-game').onclick = () => systems.closeModals();
        document.getElementById('btn-save-game').onclick = () => systems.saveGame();
        document.getElementById('btn-restart-game').onclick = () => {
            if (confirm('¿Reiniciar partida? Todo el progreso no guardado se perderá.')) {
                localStorage.removeItem('survival_quest_save');
                location.reload();
            }
        };

        document.getElementById('btn-sound-toggle').onclick = (e) => {
            const on = Sounds.toggle();
            e.target.innerText = `🔊 Sonido: ${on ? 'ON' : 'OFF'}`;
        };

        document.getElementById('btn-menu-controls').onclick = () => this.toggleModal('modal-controls');
        document.getElementById('btn-show-controls').onclick = () => this.toggleModal('modal-controls');
        document.getElementById('btn-menu-about').onclick = () => this.toggleModal('modal-about');

        // Modal de Base de Datos y Diccionario de Datos (Anexo B y C)
        document.getElementById('btn-show-database').onclick = () => {
            this.toggleModal('modal-database');
            this.refreshDatabaseModal();
        };

        document.getElementById('btn-export-save').onclick = () => {
            const data = systems.generateDatabaseSnapshot();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `survival_quest_partida_dia${this.dayCount}.json`;
            a.click();
            URL.revokeObjectURL(url);
        };

        document.getElementById('btn-import-save').onclick = () => {
            document.getElementById('file-import-input').click();
        };

        document.getElementById('file-import-input').onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    localStorage.setItem('survival_quest_save', ev.target.result);
                    systems.loadGame();
                    this.refreshDatabaseModal();
                    systems.notify('¡Partida importada con éxito!', 'success');
                } catch (err) {
                    alert('Archivo JSON no válido.');
                }
            };
            reader.readAsText(file);
        };

        document.getElementById('btn-respawn').onclick = () => {
            location.reload();
        };

        // Cerrar modales con [X]
        document.querySelectorAll('.modal-close-btn').forEach(btn => {
            btn.onclick = () => {
                const targetId = btn.dataset.close;
                if (targetId) document.getElementById(targetId).classList.add('hidden');
            };
        });
    }

    toggleModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        const isCurrentlyHidden = modal.classList.contains('hidden');
        systems.closeModals();
        if (isCurrentlyHidden) {
            modal.classList.remove('hidden');
            if (modalId === 'modal-crafting') this.setupCraftingUI();
            if (modalId === 'modal-inventory') systems.inventory.renderAll();
        }
    }

    // Lógica del Taller de Fabricación (Crafting)
    setupCraftingUI() {
        const catBtns = document.querySelectorAll('.cat-btn');
        let activeCat = 'tools';

        const renderRecipes = (cat) => {
            const container = document.getElementById('recipes-list');
            container.innerHTML = '';

            const filtered = CRAFTING_RECIPES.filter(r => r.category === cat);
            filtered.forEach(recipe => {
                const card = document.createElement('div');
                card.className = 'recipe-card';
                card.innerHTML = `
                    <div class="recipe-icon">${recipe.icon}</div>
                    <div class="recipe-name">${recipe.name}</div>
                `;
                card.onclick = () => {
                    document.querySelectorAll('.recipe-card').forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                    this.showRecipeDetail(recipe);
                };
                container.appendChild(card);
            });

            if (filtered.length > 0) {
                this.showRecipeDetail(filtered[0]);
            }
        };

        catBtns.forEach(btn => {
            btn.onclick = () => {
                catBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeCat = btn.dataset.category;
                renderRecipes(activeCat);
            };
        });

        renderRecipes(activeCat);
    }

    showRecipeDetail(recipe) {
        const panel = document.getElementById('recipe-detail-panel');
        const canCraft = systems.inventory.hasMaterials(recipe.materials);

        let materialsHtml = '';
        recipe.materials.forEach(mat => {
            const current = systems.inventory.countItem(mat.id);
            const hasEnough = current >= mat.count;
            materialsHtml += `
                <li class="craft-mat-item ${hasEnough ? 'has-enough' : 'missing'}">
                    <span>${systems.inventory.getItemIcon(mat.id)} ${systems.inventory.getItemName(mat.id)}</span>
                    <span>${current} / ${mat.count}</span>
                </li>
            `;
        });

        panel.innerHTML = `
            <div>
                <h3>${recipe.icon} ${recipe.name}</h3>
                <p style="font-size:12px; color:#a0aec0; margin-top:4px;">Materiales necesarios:</p>
                <ul class="craft-materials-list">${materialsHtml}</ul>
            </div>
            <button class="btn-craft" id="btn-do-craft" ${canCraft ? '' : 'disabled'}>
                ${canCraft ? '🔨 Fabricar Objeto' : 'Faltan Materiales'}
            </button>
        `;

        const doCraftBtn = document.getElementById('btn-do-craft');
        if (doCraftBtn && canCraft) {
            doCraftBtn.onclick = () => {
                systems.inventory.consumeMaterials(recipe.materials);
                systems.inventory.addItem(recipe.resultId, recipe.count);
                Sounds.playCraft();
                systems.notify(`¡Has fabricado ${recipe.name}!`, 'success');
                systems.quests.checkProgress('craft', recipe.resultId, recipe.count);
                this.showRecipeDetail(recipe);
                this.setupCraftingUI();
            };
        }
    }

    refreshDatabaseModal() {
        const data = systems.generateDatabaseSnapshot();
        document.getElementById('db-player-json').innerText = JSON.stringify(data.jugador, null, 2);
        document.getElementById('db-inventory-json').innerText = JSON.stringify(data.inventario, null, 2);
        document.getElementById('db-world-json').innerText = JSON.stringify({
            partida: data.partida,
            estructuras: data.estructuras
        }, null, 2);
    }

    // Interacción Contextual con [E] (Beber del río, dormir en refugio, cosechar)
    handleInteraction() {
        // 1. Comprobar si está cerca de agua dulce para beber
        if (world.isNearWater(this.player.x, this.player.y, 55)) {
            Sounds.playDrink();
            systems.vitals.hydrate(40);
            systems.notify('Bebiste agua fresca del río (+40 Sed)', 'success');
            systems.quests.checkProgress('drink', 'river', 1);
            return;
        }

        // 2. Comprobar si está junto a un refugio para dormir
        for (const st of world.structures) {
            if (st.type === 'shelter' && Math.hypot(this.player.x - st.x, this.player.y - st.y) < 65) {
                // Pasar la noche si es tarde
                if (this.isNight || this.timeOfDay > 0.75 || this.timeOfDay < 0.2) {
                    this.dayCount++;
                    this.timeOfDay = 0.28; // Despertar a las 06:30 AM
                    systems.vitals.restFull();
                    systems.saveGame();
                    systems.notify(`Has dormido en el refugio. ¡Comienza el Día ${this.dayCount}!`, 'success');
                    systems.quests.checkProgress('days', 3, 1);
                    return;
                } else {
                    systems.notify('Solo puedes dormir en el refugio durante el atardecer o la noche.', 'info');
                    return;
                }
            }
        }

        // 3. Comprobar si hay un arbusto de bayas junto al jugador
        for (const res of world.resources) {
            if (res.health > 0 && res.type === 'bush') {
                if (Math.hypot(this.player.x - res.x, this.player.y - res.y) < 50) {
                    res.health = 0;
                    world.spawnDrop('berries', res.x, res.y, 3);
                    world.spawnDrop('fiber', res.x, res.y, 1);
                    Sounds.playPickup();
                    systems.notify('Recolectaste bayas silvestres', 'success');
                    return;
                }
            }
        }
    }

    // Uso de herramienta activa con [ESPACIO] o Clic Izquierdo
    handleUseTool() {
        const activeItem = systems.inventory.getActiveItem();
        this.player.swingTool(activeItem);

        // Si es comida o bebida activa en hotbar, consumirla
        if (activeItem) {
            const def = ITEM_DEFINITIONS[activeItem.id];
            if (def && (def.category === 'food' || activeItem.id === 'canteen')) {
                systems.inventory.useItem(systems.inventory.selectedHotbarIndex);
                return;
            }
        }

        // Consumir un poco de energía al golpear
        systems.vitals.consumeEnergy(3);

        // Vector hacia donde golpea (posición del ratón o enfrente del jugador)
        const hitTargetX = this.input.worldMouseX || (this.player.x + (this.player.facing === 'right' ? 35 : this.player.facing === 'left' ? -35 : 0));
        const hitTargetY = this.input.worldMouseY || (this.player.y + (this.player.facing === 'down' ? 35 : this.player.facing === 'up' ? -35 : 0));

        // Poder de la herramienta activa
        let toolPower = 1.0;
        let isAxe = false;
        let isPickaxe = false;
        let isSpear = false;

        if (activeItem) {
            if (activeItem.id === 'stone_axe') { toolPower = 2.5; isAxe = true; }
            if (activeItem.id === 'stone_pickaxe') { toolPower = 2.5; isPickaxe = true; }
            if (activeItem.id === 'spear') { toolPower = 3.5; isSpear = true; }
        }

        const hitRadius = 55;

        // 1. Golpear Recursos (Árboles y Rocas)
        let hitResource = false;
        for (const res of world.resources) {
            if (res.health <= 0) continue;
            const dist = Math.hypot(this.player.x - res.x, this.player.y - res.y);
            const distToClick = Math.hypot(hitTargetX - res.x, hitTargetY - res.y);

            if (dist < hitRadius + res.radius || distToClick < res.radius + 15) {
                hitResource = true;
                let damageDealt = 1;

                if (res.type === 'tree') {
                    damageDealt = isAxe ? 2 : 1;
                    Sounds.playChopTree();
                    world.addParticles(res.x, res.y, '#8b5a2b', 5);
                } else if (res.type === 'rock') {
                    damageDealt = isPickaxe ? 2 : 1;
                    Sounds.playMineRock();
                    world.addParticles(res.x, res.y, '#a0aec0', 5);
                } else {
                    Sounds.playChopTree();
                }

                res.health -= damageDealt;

                if (res.health <= 0) {
                    // Recurso destruido -> soltar materiales
                    const yieldCount = Math.floor(Math.random() * (res.yieldMax - res.yieldMin + 1)) + res.yieldMin;
                    world.spawnDrop(res.resource, res.x, res.y, yieldCount);

                    if (res.rareYield && Math.random() < 0.6) {
                        world.spawnDrop(res.rareYield, res.x, res.y, 1);
                    }
                    systems.notify(`Has talado/extraído ${res.name}`, 'info');
                }
                break;
            }
        }

        // 2. Golpear Animales Silvestres
        if (!hitResource) {
            for (const animal of this.animals) {
                if (!animal.alive) continue;
                const dist = Math.hypot(this.player.x - animal.x, this.player.y - animal.y);
                const distToClick = Math.hypot(hitTargetX - animal.x, hitTargetY - animal.y);

                if (dist < hitRadius + animal.radius || distToClick < animal.radius + 15) {
                    const dmg = isSpear ? 3 : 1;
                    animal.takeDamage(dmg, world);
                    Sounds.playHurt();
                    break;
                }
            }
        }

        // 3. Golpear Lobos Nocturnos
        if (!hitResource) {
            for (const wolf of this.wolves) {
                if (!wolf.alive) continue;
                const dist = Math.hypot(this.player.x - wolf.x, this.player.y - wolf.y);
                const distToClick = Math.hypot(hitTargetX - wolf.x, hitTargetY - wolf.y);

                if (dist < hitRadius + wolf.radius || distToClick < wolf.radius + 15) {
                    const dmg = isSpear ? 3 : 1.5;
                    wolf.takeDamage(dmg, world);
                    Sounds.playHurt();
                    break;
                }
            }
        }
    }

    // Bucle Principal de Juego
    loop(currentTime) {
        if (!this.isRunning) return;

        const dt = Math.min(0.1, (currentTime - this.lastTime) / 1000);
        this.lastTime = currentTime;

        this.update(dt);
        this.render();

        requestAnimationFrame((t) => this.loop(t));
    }

    // Actualización de Lógica
    update(dt) {
        // Avance del Ciclo Día / Noche
        this.timeOfDay = (this.timeOfDay + this.daySpeed * dt) % 1.0;
        this.isNight = (this.timeOfDay > 0.75 || this.timeOfDay < 0.22);
        this.updateClockUI();

        // Actualizar Jugador y Vitals
        this.player.update(dt, this.input, world, systems.vitals);
        systems.vitals.update(dt, this.player.isSprinting, this.player.isMoving);

        // Comprobar Muerte (Game Over)
        if (systems.vitals.health <= 0) {
            this.handleGameOver();
            return;
        }

        // Actualizar Animales
        for (const animal of this.animals) {
            animal.update(dt, this.player, world);
        }

        // Generar y actualizar Lobos Nocturnos
        if (this.isNight) {
            this.wolfSpawnTimer -= dt;
            if (this.wolfSpawnTimer <= 0 && this.wolves.filter(w => w.alive).length < 4) {
                this.wolfSpawnTimer = 18;
                // Aparecer fuera de la pantalla del jugador
                const angle = Math.random() * Math.PI * 2;
                const dist = 550 + Math.random() * 200;
                const wx = this.player.x + Math.cos(angle) * dist;
                const wy = this.player.y + Math.sin(angle) * dist;
                this.wolves.push(new NightWolf(wx, wy));
                systems.notify('¡Aúlla un lobo en la oscuridad de la noche!', 'danger');
            }
        }
        for (const wolf of this.wolves) {
            wolf.update(dt, this.player, world, this.isNight);
        }

        // Actualizar Mundo
        world.update(dt);

        // Cámara suave que sigue al personaje
        const targetCamX = this.player.x - this.canvas.width / 2;
        const targetCamY = this.player.y - this.canvas.height / 2;
        this.camera.x += (targetCamX - this.camera.x) * 6 * dt;
        this.camera.y += (targetCamY - this.camera.y) * 6 * dt;

        // Auto-guardado
        this.autoSaveTimer -= dt;
        if (this.autoSaveTimer <= 0) {
            this.autoSaveTimer = 60;
            systems.saveGame();
        }

        // Actualizar prompt de interacción en pantalla si está cerca de agua o refugio
        const prompt = document.getElementById('interaction-prompt');
        const promptText = document.getElementById('prompt-text');
        if (prompt && promptText) {
            if (world.isNearWater(this.player.x, this.player.y, 55)) {
                prompt.classList.remove('hidden');
                promptText.innerText = 'Beber agua dulce';
            } else {
                let nearShelter = false;
                for (const st of world.structures) {
                    if (st.type === 'shelter' && Math.hypot(this.player.x - st.x, this.player.y - st.y) < 65) {
                        prompt.classList.remove('hidden');
                        promptText.innerText = 'Dormir en Refugio';
                        nearShelter = true;
                        break;
                    }
                }
                if (!nearShelter) {
                    prompt.classList.add('hidden');
                }
            }
        }
    }

    updateClockUI() {
        const timeIcon = document.getElementById('time-icon');
        const timeStr = document.getElementById('time-string');
        const timePhase = document.getElementById('time-phase');
        const timeBar = document.getElementById('time-bar-fill');
        const dayBadge = document.getElementById('day-badge');

        if (dayBadge) dayBadge.innerText = `Día ${this.dayCount}`;

        // Calcular hora ficticia (0.0 = medianoche 00:00, 0.5 = 12:00)
        const totalMinutes = Math.floor(this.timeOfDay * 24 * 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = (hours % 12) === 0 ? 12 : (hours % 12);
        const formatted = `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;

        if (timeStr) timeStr.innerText = formatted;

        if (timePhase && timeIcon) {
            if (this.timeOfDay >= 0.22 && this.timeOfDay < 0.35) {
                timeIcon.innerText = '🌅';
                timePhase.innerText = 'Amanecer';
            } else if (this.timeOfDay >= 0.35 && this.timeOfDay < 0.70) {
                timeIcon.innerText = '☀️';
                timePhase.innerText = 'Día Soleado';
            } else if (this.timeOfDay >= 0.70 && this.timeOfDay < 0.82) {
                timeIcon.innerText = '🌇';
                timePhase.innerText = 'Atardecer';
            } else {
                timeIcon.innerText = '🌙';
                timePhase.innerText = 'Noche Peligrosa';
            }
        }

        if (timeBar) {
            timeBar.style.width = `${this.timeOfDay * 100}%`;
        }
    }

    handleGameOver() {
        this.isRunning = false;
        document.getElementById('screen-game-over').classList.remove('hidden');
        document.getElementById('death-days').innerText = this.dayCount;
        let totalResources = 0;
        systems.inventory.slots.forEach(s => { if (s) totalResources += s.count; });
        document.getElementById('death-resources').innerText = totalResources;
    }

    // Renderizado Gráfico
    render() {
        const ctx = this.ctx;
        const camX = this.camera.x;
        const camY = this.camera.y;

        // Limpiar pantalla
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 1. Renderizar Terreno
        world.renderTerrain(ctx, camX, camY, this.canvas.width, this.canvas.height);

        // 2. Renderizar Estructuras Construidas
        world.renderStructures(ctx, camX, camY);

        // 3. Renderizar Drops en el suelo
        world.renderDrops(ctx, camX, camY);

        // 4. Renderizar Recursos Naturales (Árboles, Rocas, Arbustos)
        world.renderResources(ctx, camX, camY);

        // 5. Renderizar Fauna y Enemigos
        for (const animal of this.animals) {
            animal.render(ctx, camX, camY);
        }
        for (const wolf of this.wolves) {
            wolf.render(ctx, camX, camY);
        }

        // 6. Renderizar Jugador
        this.player.render(ctx, camX, camY);

        // 7. Renderizar Partículas de Impacto
        world.renderParticles(ctx, camX, camY);

        // 8. Previsualización de Construcción Ghost
        systems.building.renderGhostPreview(ctx, camX, camY, world);

        // 9. Capa de Iluminación Dinámica Día / Noche (Luz y Sombras)
        this.renderLighting();
    }

    // Sistema de Iluminación Ambiental y Fuentes de Luz (Sección 4.5 y 4.6)
    renderLighting() {
        const lCtx = this.lightCtx;
        const w = this.lightCanvas.width;
        const h = this.lightCanvas.height;
        const camX = this.camera.x;
        const camY = this.camera.y;

        lCtx.clearRect(0, 0, w, h);

        // Calcular oscuridad según hora del día
        let darkness = 0.0;
        if (this.timeOfDay >= 0.70 && this.timeOfDay < 0.85) {
            // Atardecer: 0.0 a 0.88
            darkness = ((this.timeOfDay - 0.70) / 0.15) * 0.88;
        } else if (this.timeOfDay >= 0.85 || this.timeOfDay < 0.20) {
            // Noche profunda
            darkness = 0.90;
        } else if (this.timeOfDay >= 0.20 && this.timeOfDay < 0.32) {
            // Amanecer: 0.88 a 0.0
            darkness = (1.0 - (this.timeOfDay - 0.20) / 0.12) * 0.88;
        }

        if (darkness <= 0.02) return; // Pleno día sin oscuridad

        // Fondo oscuro de la noche
        lCtx.fillStyle = `rgba(5, 12, 22, ${darkness})`;
        lCtx.fillRect(0, 0, w, h);

        // Usar modo destination-out para cortar agujeros de luz en la oscuridad
        lCtx.globalCompositeOperation = 'destination-out';

        // 1. Luz del Jugador (pequeña visión nocturna o linterna)
        const playerScreenX = this.player.x - camX;
        const playerScreenY = this.player.y - camY;

        let playerLightRadius = 75;
        if (this.player.activeTool && this.player.activeTool.includes('torch')) {
            playerLightRadius = 180; // Antorcha da mucha más luz
        }

        const playerGrd = lCtx.createRadialGradient(
            playerScreenX, playerScreenY, 15,
            playerScreenX, playerScreenY, playerLightRadius
        );
        playerGrd.addColorStop(0, 'rgba(0, 0, 0, 1)');
        playerGrd.addColorStop(1, 'rgba(0, 0, 0, 0)');
        lCtx.fillStyle = playerGrd;
        lCtx.beginPath();
        lCtx.arc(playerScreenX, playerScreenY, playerLightRadius, 0, Math.PI * 2);
        lCtx.fill();

        // 2. Luz de las Fogatas Construidas (Gran resplandor cálido parpadeante)
        for (const st of world.structures) {
            if (st.type === 'campfire') {
                const fsx = st.x - camX;
                const fsy = st.y - camY;
                const flicker = Math.sin(Date.now() / 90) * 12;
                const fireRadius = 190 + flicker;

                const fireGrd = lCtx.createRadialGradient(
                    fsx, fsy, 20,
                    fsx, fsy, fireRadius
                );
                fireGrd.addColorStop(0, 'rgba(0, 0, 0, 1)');
                fireGrd.addColorStop(0.7, 'rgba(0, 0, 0, 0.7)');
                fireGrd.addColorStop(1, 'rgba(0, 0, 0, 0)');

                lCtx.fillStyle = fireGrd;
                lCtx.beginPath();
                lCtx.arc(fsx, fsy, fireRadius, 0, Math.PI * 2);
                lCtx.fill();
            }
        }

        lCtx.globalCompositeOperation = 'source-over';
    }
}

// Variables Globales
let world = null;
const game = new GameEngine();

// Iniciar al cargar el DOM
window.addEventListener('DOMContentLoaded', () => {
    game.init();
});
