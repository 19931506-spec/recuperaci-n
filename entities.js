// SURVIVAL QUEST - Entidades: Jugador, Animales Silvestres y Depredadores Nocturnos
// Conforme a las Secciones 4.2, 4.4 y 4.5 del proyecto

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 16;
        this.baseSpeed = 160;   // Velocidad normal (píxeles por segundo)
        this.sprintSpeed = 260; // Velocidad al correr con Shift
        this.vx = 0;
        this.vy = 0;
        this.facing = 'down'; // 'up', 'down', 'left', 'right'
        this.isMoving = false;
        this.isSprinting = false;

        // Animación de balanceo al caminar
        this.walkTimer = 0;
        this.stepTimer = 0;

        // Animación de ataque / uso de herramienta
        this.isSwinging = false;
        this.swingProgress = 0;
        this.activeTool = null; // 'stone_axe', 'stone_pickaxe', 'spear', 'torch', etc.

        // Daño recibido e invulnerabilidad temporal
        this.hurtTimer = 0;
    }

    update(dt, input, world, vitals) {
        // Reducir temporizador de daño
        if (this.hurtTimer > 0) this.hurtTimer -= dt;

        // Animación de golpe con herramienta
        if (this.isSwinging) {
            this.swingProgress += dt * 7;
            if (this.swingProgress >= 1.0) {
                this.isSwinging = false;
                this.swingProgress = 0;
            }
        }

        // Procesar dirección de entrada
        let dx = 0;
        let dy = 0;

        if (input.up) dy -= 1;
        if (input.down) dy += 1;
        if (input.left) dx -= 1;
        if (input.right) dx += 1;

        // Normalizar vector para evitar velocidad diagonal extra
        if (dx !== 0 && dy !== 0) {
            const length = Math.SQRT2;
            dx /= length;
            dy /= length;
        }

        this.isMoving = (dx !== 0 || dy !== 0);

        // Determinar orientación
        if (Math.abs(dx) > Math.abs(dy)) {
            this.facing = dx > 0 ? 'right' : 'left';
        } else if (dy !== 0) {
            this.facing = dy > 0 ? 'down' : 'up';
        }

        // Determinar si corre con SHIFT y hay energía
        this.isSprinting = input.sprint && this.isMoving && vitals.energy > 5;
        const currentSpeed = this.isSprinting ? this.sprintSpeed : this.baseSpeed;

        if (this.isSprinting) {
            vitals.consumeEnergy(dt * 15);
            vitals.consumeHunger(dt * 0.8);
        }

        // Movimiento con detección de colisión en dos ejes separados (deslizamiento por paredes)
        const moveX = dx * currentSpeed * dt;
        const moveY = dy * currentSpeed * dt;

        if (!world.isBlocked(this.x + moveX, this.y, this.radius)) {
            this.x += moveX;
        }
        if (!world.isBlocked(this.x, this.y + moveY, this.radius)) {
            this.y += moveY;
        }

        // Sonido de pasos y animación
        if (this.isMoving) {
            this.walkTimer += dt * (this.isSprinting ? 14 : 9);
            this.stepTimer += dt;
            if (this.stepTimer > (this.isSprinting ? 0.25 : 0.38)) {
                this.stepTimer = 0;
                Sounds.playFootstep();
            }
        } else {
            this.walkTimer = 0;
        }

        // Absorber Drops cercanos (Imán de ítems a 50px)
        for (let i = world.drops.length - 1; i >= 0; i--) {
            const drop = world.drops[i];
            const dist = Math.hypot(this.x - drop.x, this.y - drop.y);
            if (dist < 50) {
                // Acercar hacia el jugador
                const angle = Math.atan2(this.y - drop.y, this.x - drop.x);
                drop.x += Math.cos(angle) * 220 * dt;
                drop.y += Math.sin(angle) * 220 * dt;

                if (dist < 18) {
                    // Recoger ítem en el inventario
                    const added = systems.inventory.addItem(drop.itemId, drop.count);
                    if (added) {
                        Sounds.playPickup();
                        systems.notify(`+${drop.count} ${systems.inventory.getItemName(drop.itemId)}`, 'success');
                        systems.quests.checkProgress('collect', drop.itemId, drop.count);
                        world.drops.splice(i, 1);
                    }
                }
            }
        }
    }

    // Iniciar golpe / uso de herramienta hacia el objetivo del cursor o enfrente
    swingTool(activeItem) {
        if (this.isSwinging) return;
        this.isSwinging = true;
        this.swingProgress = 0;
        this.activeTool = activeItem ? activeItem.id : null;
    }

    // Recibir daño de un enemigo o entorno
    takeDamage(amount, reason = "Peligro") {
        if (this.hurtTimer > 0) return;
        this.hurtTimer = 0.6; // Invulnerabilidad temporal
        Sounds.playHurt();
        systems.vitals.damage(amount);

        // Empuje visual
        systems.notify(`¡Has recibido daño! (-${amount} Salud)`, 'danger');
    }

    // Renderizar al jugador
    render(ctx, camX, camY) {
        const sx = this.x - camX;
        const sy = this.y - camY;

        // Sombra
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(sx, sy + 14, 14, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Parpadeo rojo si fue golpeado recientemente
        if (this.hurtTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0) {
            ctx.fillStyle = '#ff6b6b';
        }

        const bob = Math.sin(this.walkTimer) * 2;

        // Mochila de exploración en la espalda
        ctx.fillStyle = '#8b5a2b';
        ctx.fillRect(sx - 11, sy - 2 + bob, 22, 12);
        ctx.fillStyle = '#654321';
        ctx.fillRect(sx - 9, sy + 3 + bob, 18, 4);

        // Cuerpo / Camisa de explorador
        ctx.fillStyle = '#2f855a'; // Chaqueta verde bosque
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(sx - 10, sy - 8 + bob, 20, 18, 4);
        } else {
            ctx.rect(sx - 10, sy - 8 + bob, 20, 18);
        }
        ctx.fill();

        // Cinturón con hebilla de cuero
        ctx.fillStyle = '#4a3728';
        ctx.fillRect(sx - 10, sy + 6 + bob, 20, 4);
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(sx - 2, sy + 6 + bob, 4, 4);

        // Cabeza
        ctx.fillStyle = '#fbd38d'; // Piel
        ctx.beginPath();
        ctx.arc(sx, sy - 14 + bob, 9, 0, Math.PI * 2);
        ctx.fill();

        // Sombrero de explorador
        ctx.fillStyle = '#975a16';
        ctx.beginPath();
        ctx.ellipse(sx, sy - 18 + bob, 14, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(sx, sy - 20 + bob, 7, Math.PI, 0);
        ctx.fill();

        // Ojos según la dirección
        ctx.fillStyle = '#1a202c';
        if (this.facing === 'down') {
            ctx.fillRect(sx - 4, sy - 14 + bob, 2, 3);
            ctx.fillRect(sx + 2, sy - 14 + bob, 2, 3);
        } else if (this.facing === 'left') {
            ctx.fillRect(sx - 6, sy - 14 + bob, 2, 3);
        } else if (this.facing === 'right') {
            ctx.fillRect(sx + 4, sy - 14 + bob, 2, 3);
        }

        // Renderizar Herramienta en mano y animación de balanceo
        this.renderTool(ctx, sx, sy + bob);
    }

    renderTool(ctx, sx, sy) {
        if (!this.activeTool) return;

        ctx.save();
        ctx.translate(sx, sy);

        // Ángulo base según la orientación
        let baseAngle = 0;
        if (this.facing === 'right') baseAngle = 0.4;
        else if (this.facing === 'left') baseAngle = -2.5;
        else if (this.facing === 'up') baseAngle = -1.2;
        else baseAngle = 1.0;

        // Añadir arco del golpe
        if (this.isSwinging) {
            const swingArc = Math.sin(this.swingProgress * Math.PI) * 1.5;
            baseAngle += swingArc;
        }

        ctx.rotate(baseAngle);

        // Dibujar la herramienta según el tipo
        if (this.activeTool.includes('axe')) {
            // Mango de madera
            ctx.fillStyle = '#8b5a2b';
            ctx.fillRect(10, -3, 20, 6);
            // Filo de piedra del hacha
            ctx.fillStyle = '#a0aec0';
            ctx.beginPath();
            ctx.moveTo(26, -12);
            ctx.lineTo(34, -4);
            ctx.lineTo(26, 4);
            ctx.closePath();
            ctx.fill();
        } else if (this.activeTool.includes('pickaxe')) {
            // Mango
            ctx.fillStyle = '#8b5a2b';
            ctx.fillRect(10, -3, 20, 6);
            // Cabeza arqueada del pico
            ctx.fillStyle = '#718096';
            ctx.beginPath();
            ctx.arc(28, -2, 10, -Math.PI / 2, Math.PI / 2);
            ctx.lineWidth = 4;
            ctx.strokeStyle = '#a0aec0';
            ctx.stroke();
        } else if (this.activeTool.includes('spear')) {
            // Mango largo de lanza
            ctx.fillStyle = '#8b5a2b';
            ctx.fillRect(10, -2, 34, 4);
            // Punta de pedernal
            ctx.fillStyle = '#e2e8f0';
            ctx.beginPath();
            ctx.moveTo(44, -6);
            ctx.lineTo(54, 0);
            ctx.lineTo(44, 6);
            ctx.closePath();
            ctx.fill();
        } else if (this.activeTool.includes('torch')) {
            // Mango
            ctx.fillStyle = '#8b5a2b';
            ctx.fillRect(10, -3, 16, 6);
            // Llama de antorcha
            const flicker = Math.sin(Date.now() / 60) * 2;
            ctx.fillStyle = '#dd6b20';
            ctx.beginPath();
            ctx.arc(26, 0, 7 + flicker, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffd166';
            ctx.beginPath();
            ctx.arc(26, 0, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

// Entidades de Animales: Conejos pacíficos y Ciervos
class Animal {
    constructor(type, x, y) {
        this.type = type; // 'rabbit' o 'deer'
        this.x = x;
        this.y = y;
        this.radius = (type === 'rabbit') ? 12 : 20;
        this.health = (type === 'rabbit') ? 2 : 5;
        this.maxHealth = this.health;
        this.speed = (type === 'rabbit') ? 90 : 110;
        this.fleeSpeed = (type === 'rabbit') ? 170 : 190;
        this.state = 'idle'; // 'idle', 'wander', 'flee'
        this.stateTimer = 1 + Math.random() * 3;
        this.vx = 0;
        this.vy = 0;
        this.alive = true;
    }

    update(dt, player, world) {
        if (!this.alive) return;

        const distToPlayer = Math.hypot(this.x - player.x, this.y - player.y);

        // Huir si el jugador se acerca mucho
        if (distToPlayer < 90) {
            this.state = 'flee';
            const angle = Math.atan2(this.y - player.y, this.x - player.x);
            this.vx = Math.cos(angle) * this.fleeSpeed;
            this.vy = Math.sin(angle) * this.fleeSpeed;
        } else {
            // Comportamiento de deambular pacífico
            this.stateTimer -= dt;
            if (this.stateTimer <= 0) {
                if (Math.random() < 0.5) {
                    this.state = 'idle';
                    this.vx = 0;
                    this.vy = 0;
                    this.stateTimer = 1.5 + Math.random() * 2;
                } else {
                    this.state = 'wander';
                    const angle = Math.random() * Math.PI * 2;
                    this.vx = Math.cos(angle) * this.speed;
                    this.vy = Math.sin(angle) * this.speed;
                    this.stateTimer = 1 + Math.random() * 2;
                }
            }
        }

        // Mover con colisión
        const nextX = this.x + this.vx * dt;
        const nextY = this.y + this.vy * dt;
        if (!world.isBlocked(nextX, nextY, this.radius)) {
            this.x = nextX;
            this.y = nextY;
        } else {
            this.vx = -this.vx;
            this.vy = -this.vy;
        }
    }

    takeDamage(dmg, world) {
        this.health -= dmg;
        world.addParticles(this.x, this.y, '#e53e3e', 6);
        if (this.health <= 0) {
            this.alive = false;
            // Soltar carne y pieles
            world.spawnDrop('meat_raw', this.x, this.y, this.type === 'rabbit' ? 1 : 2);
            world.spawnDrop('fiber', this.x, this.y, 1);
            systems.notify(`Has cazado un ${this.type === 'rabbit' ? 'Conejo' : 'Ciervo'}`, 'success');
            systems.quests.checkProgress('hunt', this.type, 1);
        }
    }

    render(ctx, camX, camY) {
        if (!this.alive) return;
        const sx = this.x - camX;
        const sy = this.y - camY;

        // Sombra
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        ctx.ellipse(sx, sy + this.radius * 0.6, this.radius, this.radius * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        if (this.type === 'rabbit') {
            // Cuerpo conejo blanco/gris
            ctx.fillStyle = '#e2e8f0';
            ctx.beginPath();
            ctx.arc(sx, sy, 10, 0, Math.PI * 2);
            ctx.fill();
            // Orejas
            ctx.fillStyle = '#cbd5e0';
            ctx.fillRect(sx - 4, sy - 16, 3, 8);
            ctx.fillRect(sx + 1, sy - 16, 3, 8);
            // Ojo
            ctx.fillStyle = '#e53e3e';
            ctx.beginPath();
            ctx.arc(sx + 3, sy - 2, 1.5, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Ciervo / Cierva
            ctx.fillStyle = '#a0522d';
            ctx.fillRect(sx - 14, sy - 10, 28, 16);
            ctx.beginPath();
            ctx.arc(sx + 12, sy - 14, 8, 0, Math.PI * 2);
            ctx.fill();
            // Cornamenta
            ctx.strokeStyle = '#5d4037';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(sx + 12, sy - 20);
            ctx.lineTo(sx + 16, sy - 28);
            ctx.moveTo(sx + 12, sy - 20);
            ctx.lineTo(sx + 8, sy - 28);
            ctx.stroke();
        }
    }
}

// Depredador Nocturno: Lobo del Bosque
class NightWolf {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 18;
        this.health = 6;
        this.speed = 135;
        this.alive = true;
        this.attackTimer = 0;
    }

    update(dt, player, world, isNight) {
        if (!this.alive) return;
        if (this.attackTimer > 0) this.attackTimer -= dt;

        // Si es de día, el lobo desaparece o huye
        if (!isNight) {
            this.alive = false;
            return;
        }

        const distToPlayer = Math.hypot(this.x - player.x, this.y - player.y);

        // Verificar si el jugador está cerca del fuego de una fogata (el lobo teme al fuego)
        let nearFire = false;
        for (const st of world.structures) {
            if (st.type === 'campfire' && Math.hypot(player.x - st.x, player.y - st.y) < 140) {
                nearFire = true;
                break;
            }
        }

        // Si el jugador está al lado del fuego o sostiene una antorcha, el lobo mantiene distancia
        if (nearFire || (player.activeTool && player.activeTool.includes('torch'))) {
            if (distToPlayer < 120) {
                // Retroceder con miedo
                const angle = Math.atan2(this.y - player.y, this.x - player.x);
                this.x += Math.cos(angle) * this.speed * dt;
                this.y += Math.sin(angle) * this.speed * dt;
                return;
            }
        }

        // Perseguir al jugador
        if (distToPlayer > 26) {
            const angle = Math.atan2(player.y - this.y, player.x - this.x);
            const nx = this.x + Math.cos(angle) * this.speed * dt;
            const ny = this.y + Math.sin(angle) * this.speed * dt;
            if (!world.isBlocked(nx, ny, this.radius)) {
                this.x = nx;
                this.y = ny;
            }
        } else {
            // Atacar al jugador
            if (this.attackTimer <= 0) {
                this.attackTimer = 1.2;
                player.takeDamage(15, "Ataque de Lobo Nocturno");
            }
        }
    }

    takeDamage(dmg, world) {
        this.health -= dmg;
        world.addParticles(this.x, this.y, '#e53e3e', 8);
        if (this.health <= 0) {
            this.alive = false;
            world.spawnDrop('meat_raw', this.x, this.y, 2);
            world.spawnDrop('fiber', this.x, this.y, 2);
            systems.notify('¡Has derrotado a un Lobo Nocturno!', 'success');
        }
    }

    render(ctx, camX, camY) {
        if (!this.alive) return;
        const sx = this.x - camX;
        const sy = this.y - camY;

        // Sombra
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(sx, sy + 10, 16, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Cuerpo de lobo gris oscuro
        ctx.fillStyle = '#2d3748';
        ctx.fillRect(sx - 16, sy - 8, 32, 14);

        // Cabeza
        ctx.fillStyle = '#1a202c';
        ctx.beginPath();
        ctx.arc(sx + 12, sy - 4, 8, 0, Math.PI * 2);
        ctx.fill();

        // Orejas puntiagudas
        ctx.beginPath();
        ctx.moveTo(sx + 8, sy - 10);
        ctx.lineTo(sx + 12, sy - 18);
        ctx.lineTo(sx + 16, sy - 10);
        ctx.fill();

        // Ojos brillantes rojos / amarillos en la oscuridad (Terror nocturno)
        ctx.fillStyle = '#ff3838';
        ctx.beginPath();
        ctx.arc(sx + 14, sy - 5, 2.5, 0, Math.PI * 2);
        ctx.fill();
    }
}
