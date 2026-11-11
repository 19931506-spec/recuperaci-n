// SURVIVAL QUEST - Generador de Mundo y Escenarios Naturales
// Conforme a la Sección 4.5: Bosques, ríos, montañas rocosas y flora interactiva

const TILE_SIZE = 48;
const MAP_WIDTH = 80;   // 80x80 tiles = 3840x3840 píxeles de mundo abierto
const MAP_HEIGHT = 80;

const TILES = {
    GRASS: 0,
    GRASS_DARK: 1,
    SAND: 2,
    WATER: 3,
    ROCKY_GROUND: 4,
    DIRT_PATH: 5
};

class GameWorld {
    constructor() {
        this.width = MAP_WIDTH;
        this.height = MAP_HEIGHT;
        this.tileSize = TILE_SIZE;
        this.tiles = [];
        this.decorations = []; // Flores, pasto decorativo, piedritas
        this.resources = [];   // Árboles, rocas, arbustos con vida y colisión
        this.structures = [];  // Fogatas, refugios, vallas construidas por el jugador
        this.drops = [];       // Ítems caídos en el suelo listos para recoger
        this.particles = [];   // Partículas de recolección y efectos
    }

    generate(seed = 12345) {
        this.tiles = new Array(this.height);
        this.decorations = [];
        this.resources = [];
        this.structures = [];
        this.drops = [];
        this.particles = [];

        // Generar matriz de terreno base
        for (let y = 0; y < this.height; y++) {
            this.tiles[y] = new Uint8Array(this.width);
            for (let x = 0; x < this.width; x++) {
                // Algoritmo pseudo-aleatorio coherente
                const nx = x / 18.0;
                const ny = y / 18.0;
                const noise = Math.sin(nx + seed) * Math.cos(ny + seed * 0.5) +
                              Math.sin(nx * 2.1) * 0.3;

                // Definir Río que cruza el mapa de norte a sur de forma sinuosa
                const riverCenterX = 40 + Math.sin(y * 0.12) * 12 + Math.cos(y * 0.05) * 5;
                const distToRiver = Math.abs(x - riverCenterX);

                if (distToRiver < 3.2) {
                    this.tiles[y][x] = TILES.WATER;
                } else if (distToRiver < 4.8) {
                    this.tiles[y][x] = TILES.SAND;
                } else if (x > 58 || y < 15) {
                    // Zona montañosa al este y norte
                    this.tiles[y][x] = TILES.ROCKY_GROUND;
                } else if (noise > 0.4) {
                    this.tiles[y][x] = TILES.GRASS_DARK;
                } else {
                    this.tiles[y][x] = TILES.GRASS;
                }

                // Decoraciones florales en pasto
                if ((this.tiles[y][x] === TILES.GRASS || this.tiles[y][x] === TILES.GRASS_DARK) && Math.random() < 0.12) {
                    this.decorations.push({
                        x: x * TILE_SIZE + Math.random() * 32 + 8,
                        y: y * TILE_SIZE + Math.random() * 32 + 8,
                        type: Math.random() < 0.4 ? 'flower' : 'grass_tuft',
                        color: Math.random() < 0.5 ? '#f6e05e' : '#f687b3'
                    });
                }
            }
        }

        // Generar Recursos en el mapa: Árboles, Rocas, Arbustos de Bayas
        let resIdCounter = 1;

        for (let y = 3; y < this.height - 3; y += 2) {
            for (let x = 3; x < this.width - 3; x += 2) {
                const tile = this.tiles[y][x];
                if (tile === TILES.WATER || tile === TILES.SAND) continue;

                // Zona de aparición inicial segura para el jugador (cerca del centro x=25, y=35)
                const distToSpawn = Math.hypot(x - 25, y - 35);
                if (distToSpawn < 4) continue;

                const posX = x * TILE_SIZE + (Math.random() * 20 - 10);
                const posY = y * TILE_SIZE + (Math.random() * 20 - 10);

                // Montañas = más rocas
                if (tile === TILES.ROCKY_GROUND) {
                    if (Math.random() < 0.65) {
                        this.resources.push({
                            id: resIdCounter++,
                            type: 'rock',
                            name: 'Roca Grande',
                            x: posX,
                            y: posY,
                            radius: 20,
                            health: 4,
                            maxHealth: 4,
                            resource: 'stone',
                            yieldMin: 2,
                            yieldMax: 4,
                            rareYield: 'flint'
                        });
                    }
                } else {
                    // Bosque y llanuras = Árboles y Arbustos
                    const rand = Math.random();
                    if (rand < 0.42) {
                        this.resources.push({
                            id: resIdCounter++,
                            type: 'tree',
                            name: 'Árbol de Roble',
                            x: posX,
                            y: posY,
                            radius: 22,
                            health: 4,
                            maxHealth: 4,
                            resource: 'wood',
                            yieldMin: 2,
                            yieldMax: 4,
                            rareYield: 'stick'
                        });
                    } else if (rand < 0.54) {
                        this.resources.push({
                            id: resIdCounter++,
                            type: 'bush',
                            name: 'Arbusto de Bayas',
                            x: posX,
                            y: posY,
                            radius: 16,
                            health: 2,
                            maxHealth: 2,
                            resource: 'berries',
                            yieldMin: 2,
                            yieldMax: 3,
                            rareYield: 'fiber'
                        });
                    } else if (rand < 0.62) {
                        this.resources.push({
                            id: resIdCounter++,
                            type: 'rock',
                            name: 'Roca de Río',
                            x: posX,
                            y: posY,
                            radius: 18,
                            health: 3,
                            maxHealth: 3,
                            resource: 'stone',
                            yieldMin: 1,
                            yieldMax: 3,
                            rareYield: 'flint'
                        });
                    }
                }
            }
        }
    }

    // Comprobar si una posición está bloqueada (colisión)
    isBlocked(worldX, worldY, radius = 14) {
        // Límites del mapa
        if (worldX < radius || worldX > this.width * TILE_SIZE - radius ||
            worldY < radius || worldY > this.height * TILE_SIZE - radius) {
            return true;
        }

        // Casillas de agua profunda (no caminable)
        const tileX = Math.floor(worldX / TILE_SIZE);
        const tileY = Math.floor(worldY / TILE_SIZE);
        if (this.tiles[tileY] && this.tiles[tileY][tileX] === TILES.WATER) {
            return true;
        }

        // Colisión con recursos vivos (árboles, rocas)
        for (const res of this.resources) {
            if (res.health > 0) {
                const dist = Math.hypot(worldX - res.x, worldY - res.y);
                if (dist < radius + res.radius * 0.7) {
                    return true;
                }
            }
        }

        // Colisión con estructuras construidas sólidas (refugios)
        for (const st of this.structures) {
            if (st.solid) {
                const dist = Math.hypot(worldX - st.x, worldY - st.y);
                if (dist < radius + st.radius) {
                    return true;
                }
            }
        }

        return false;
    }

    // Comprobar si el jugador está junto a agua dulce para beber
    isNearWater(worldX, worldY, maxDist = 60) {
        const startX = Math.max(0, Math.floor((worldX - maxDist) / TILE_SIZE));
        const endX = Math.min(this.width - 1, Math.floor((worldX + maxDist) / TILE_SIZE));
        const startY = Math.max(0, Math.floor((worldY - maxDist) / TILE_SIZE));
        const endY = Math.min(this.height - 1, Math.floor((worldY + maxDist) / TILE_SIZE));

        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                if (this.tiles[y][x] === TILES.WATER) {
                    const centerX = x * TILE_SIZE + TILE_SIZE / 2;
                    const centerY = y * TILE_SIZE + TILE_SIZE / 2;
                    if (Math.hypot(worldX - centerX, worldY - centerY) <= maxDist) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    // Crear partículas de impacto
    addParticles(x, y, color, count = 6) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 60 + 20;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: color,
                size: Math.random() * 3 + 2,
                life: 0.4 + Math.random() * 0.3,
                maxLife: 0.6
            });
        }
    }

    // Spawnear drop de ítem en el mundo
    spawnDrop(itemId, x, y, count = 1) {
        this.drops.push({
            id: Date.now() + Math.random(),
            itemId: itemId,
            x: x + (Math.random() * 24 - 12),
            y: y + (Math.random() * 24 - 12),
            count: count,
            bobTimer: Math.random() * Math.PI * 2,
            picked: false
        });
    }

    // Actualizar física de partículas y animaciones
    update(dt) {
        // Partículas
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // Drops flotantes bobbing
        for (const drop of this.drops) {
            drop.bobTimer += dt * 3;
        }
    }

    // Renderizar Terreno visible en la pantalla
    renderTerrain(ctx, camX, camY, viewW, viewH) {
        const startX = Math.max(0, Math.floor(camX / TILE_SIZE));
        const endX = Math.min(this.width, Math.ceil((camX + viewW) / TILE_SIZE) + 1);
        const startY = Math.max(0, Math.floor(camY / TILE_SIZE));
        const endY = Math.min(this.height, Math.ceil((camY + viewH) / TILE_SIZE) + 1);

        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const tile = this.tiles[y][x];
                const screenX = x * TILE_SIZE - camX;
                const screenY = y * TILE_SIZE - camY;

                switch (tile) {
                    case TILES.GRASS:
                        ctx.fillStyle = '#3a6639';
                        ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
                        ctx.fillStyle = '#335c32';
                        ctx.fillRect(screenX + 8, screenY + 8, 4, 4);
                        ctx.fillRect(screenX + 28, screenY + 30, 4, 4);
                        break;
                    case TILES.GRASS_DARK:
                        ctx.fillStyle = '#2d532c';
                        ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
                        ctx.fillStyle = '#254424';
                        ctx.fillRect(screenX + 16, screenY + 16, 6, 6);
                        break;
                    case TILES.SAND:
                        ctx.fillStyle = '#d4b26f';
                        ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
                        ctx.fillStyle = '#c5a35f';
                        ctx.fillRect(screenX + 12, screenY + 24, 3, 3);
                        break;
                    case TILES.WATER:
                        ctx.fillStyle = '#2b6cb0';
                        ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
                        // Ondas de agua
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
                        const waveOffset = Math.sin((Date.now() / 400) + (x + y)) * 4;
                        ctx.fillRect(screenX + 8 + waveOffset, screenY + 18, 16, 2);
                        break;
                    case TILES.ROCKY_GROUND:
                        ctx.fillStyle = '#5c6773';
                        ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
                        ctx.fillStyle = '#48525c';
                        ctx.fillRect(screenX + 10, screenY + 10, 8, 8);
                        ctx.fillRect(screenX + 30, screenY + 26, 6, 6);
                        break;
                }
            }
        }

        // Decoraciones (Flores)
        for (const deco of this.decorations) {
            if (deco.x >= camX - 20 && deco.x <= camX + viewW + 20 &&
                deco.y >= camY - 20 && deco.y <= camY + viewH + 20) {
                const sx = deco.x - camX;
                const sy = deco.y - camY;
                ctx.fillStyle = deco.color;
                ctx.beginPath();
                ctx.arc(sx, sy, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    // Renderizar Recursos (Árboles, Rocas, Arbustos)
    renderResources(ctx, camX, camY) {
        for (const res of this.resources) {
            if (res.health <= 0) continue;
            const sx = res.x - camX;
            const sy = res.y - camY;

            // Sombra
            ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
            ctx.beginPath();
            ctx.ellipse(sx, sy + res.radius * 0.6, res.radius, res.radius * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();

            if (res.type === 'tree') {
                // Tronco
                ctx.fillStyle = '#5d4037';
                ctx.fillRect(sx - 6, sy - 8, 12, 18);
                // Copa de árbol (Círculos concéntricos verdes)
                ctx.fillStyle = '#2e7d32';
                ctx.beginPath();
                ctx.arc(sx, sy - 20, res.radius * 1.1, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#388e3c';
                ctx.beginPath();
                ctx.arc(sx - 4, sy - 24, res.radius * 0.7, 0, Math.PI * 2);
                ctx.fill();
            } else if (res.type === 'rock') {
                // Roca redondeada facetada
                ctx.fillStyle = '#78909c';
                ctx.beginPath();
                ctx.arc(sx, sy, res.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#90a4ae';
                ctx.beginPath();
                ctx.arc(sx - 4, sy - 4, res.radius * 0.6, 0, Math.PI * 2);
                ctx.fill();
            } else if (res.type === 'bush') {
                // Arbusto
                ctx.fillStyle = '#2e7d32';
                ctx.beginPath();
                ctx.arc(sx, sy, res.radius, 0, Math.PI * 2);
                ctx.fill();
                // Bayas rojas
                ctx.fillStyle = '#e53e3e';
                ctx.beginPath();
                ctx.arc(sx - 5, sy - 4, 3, 0, Math.PI * 2);
                ctx.arc(sx + 6, sy - 2, 3, 0, Math.PI * 2);
                ctx.arc(sx, sy + 5, 3, 0, Math.PI * 2);
                ctx.fill();
            }

            // Barra de vida si ha recibido daño
            if (res.health < res.maxHealth) {
                const barW = 30;
                const barH = 4;
                const hpRatio = res.health / res.maxHealth;
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(sx - barW / 2, sy - res.radius - 12, barW, barH);
                ctx.fillStyle = '#48bb78';
                ctx.fillRect(sx - barW / 2, sy - res.radius - 12, barW * hpRatio, barH);
            }
        }
    }

    // Renderizar Estructuras Construidas (Fogata, Refugio, Cofres)
    renderStructures(ctx, camX, camY) {
        for (const st of this.structures) {
            const sx = st.x - camX;
            const sy = st.y - camY;

            // Sombra
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.ellipse(sx, sy + st.radius * 0.6, st.radius * 1.1, st.radius * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();

            if (st.type === 'campfire') {
                // Piedras en círculo
                ctx.fillStyle = '#4a5568';
                ctx.beginPath();
                ctx.arc(sx, sy, 18, 0, Math.PI * 2);
                ctx.fill();
                // Leños cruzados
                ctx.fillStyle = '#7b341e';
                ctx.fillRect(sx - 12, sy - 3, 24, 6);
                ctx.fillRect(sx - 3, sy - 12, 6, 24);
                // Llamas animadas
                const flicker = Math.sin(Date.now() / 80) * 3;
                ctx.fillStyle = '#dd6b20';
                ctx.beginPath();
                ctx.arc(sx, sy - 4, 12 + flicker, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ecc94b';
                ctx.beginPath();
                ctx.arc(sx, sy - 6, 7 + flicker * 0.6, 0, Math.PI * 2);
                ctx.fill();
            } else if (st.type === 'shelter') {
                // Choza de madera / Refugio
                ctx.fillStyle = '#5d4037';
                ctx.fillRect(sx - 28, sy - 24, 56, 44);
                // Techo de hojas / paja triangular
                ctx.fillStyle = '#2f855a';
                ctx.beginPath();
                ctx.moveTo(sx - 34, sy - 20);
                ctx.lineTo(sx, sy - 48);
                ctx.lineTo(sx + 34, sy - 20);
                ctx.closePath();
                ctx.fill();
                // Puerta
                ctx.fillStyle = '#2d1a0e';
                ctx.fillRect(sx - 10, sy - 4, 20, 24);
            } else if (st.type === 'chest') {
                // Cofre de madera con remaches de piedra
                ctx.fillStyle = '#8b5a2b';
                ctx.fillRect(sx - 14, sy - 10, 28, 20);
                ctx.fillStyle = '#d4af37';
                ctx.fillRect(sx - 3, sy - 2, 6, 6);
            }
        }
    }

    // Renderizar Drops (Ítems en el suelo)
    renderDrops(ctx, camX, camY) {
        for (const drop of this.drops) {
            const sx = drop.x - camX;
            const sy = drop.y - camY + Math.sin(drop.bobTimer) * 4;

            // Sombra del drop
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.ellipse(sx, drop.y - camY + 8, 8, 4, 0, 0, Math.PI * 2);
            ctx.fill();

            // Ícono visual según tipo de recurso
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            let icon = '📦';
            if (drop.itemId === 'wood') icon = '🪵';
            else if (drop.itemId === 'stone') icon = '🪨';
            else if (drop.itemId === 'berries') icon = '🫐';
            else if (drop.itemId === 'flint') icon = '🔪';
            else if (drop.itemId === 'meat_raw') icon = '🥩';
            else if (drop.itemId === 'stick') icon = '🥢';
            else if (drop.itemId === 'fiber') icon = '🌾';

            ctx.fillText(icon, sx, sy);
        }
    }

    // Renderizar Partículas
    renderParticles(ctx, camX, camY) {
        for (const p of this.particles) {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life / p.maxLife;
            ctx.beginPath();
            ctx.arc(p.x - camX, p.y - camY, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;
    }

    // Dibujar el mapa completo en el canvas de vista previa (Minimapa)
    drawMinimap(canvas, playerX, playerY) {
        const ctx = canvas.getContext('2d');
        const cellW = canvas.width / this.width;
        const cellH = canvas.height / this.height;

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const tile = this.tiles[y][x];
                if (tile === TILES.WATER) ctx.fillStyle = '#3182ce';
                else if (tile === TILES.SAND) ctx.fillStyle = '#d69e2e';
                else if (tile === TILES.ROCKY_GROUND) ctx.fillStyle = '#718096';
                else ctx.fillStyle = '#2f855a';

                ctx.fillRect(x * cellW, y * cellH, cellW + 0.5, cellH + 0.5);
            }
        }

        // Estructuras en minimapa
        for (const st of this.structures) {
            ctx.fillStyle = '#ed8936';
            const mx = (st.x / (this.width * TILE_SIZE)) * canvas.width;
            const my = (st.y / (this.height * TILE_SIZE)) * canvas.height;
            ctx.fillRect(mx - 3, my - 3, 6, 6);
        }

        // Jugador en minimapa
        ctx.fillStyle = '#ffd166';
        const px = (playerX / (this.width * TILE_SIZE)) * canvas.width;
        const py = (playerY / (this.height * TILE_SIZE)) * canvas.height;
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }
}
