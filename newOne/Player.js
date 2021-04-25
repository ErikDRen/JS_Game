var direction;

class Player extends Phaser.Physics.Arcade.Sprite 
{
    constructor(scene, x, y) 
    {
        super(scene, x, y, 'hero');
        scene.add.existing(this);
        scene.physics.world.enable(this);
        this.flag = 0;
        this.depth = 2;
        this.state = "";
        this.death = false;
        this.key = [];

        this.jump = 0;
        this.hurt = 0;

        this.slide_cooldown = 0;
        this.attack_cooldown = 0;

        this.keySpace = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.Z = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
        this.X = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);
        this.C = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);
        this.Cursors = scene.input.keyboard.createCursorKeys();
        this.setCollideWorldBounds(false);
        this.speed_walk = 85;
        this.speed_slide = 185
        this.current_slide_speed = 0;

        this.scene.time.addEvent({ delay: 50, loop: true, callback: () => {
            if(this.hurt > 0)
                this.alpha = Phaser.Math.FloatBetween(0.6, 1);
        }});
        this.player_attack = this.scene.physics.add.staticGroup();
    }

    player_get_hit()
    {
        if(this.isVulnerable() && !this.death)
        {
            this.change_state("Death");
        }
    }

    update()
    {
        if(this.hurt <= 0)
            this.alpha = 1;
        
        getKeyState(this.Z);
        getKeyState(this.X);
        getKeyState(this.keySpace);

        switch(this.state)
        {
            case "Slide":
                switch(this.flag)
                {
                    case 0:
                        this.anims.play('hero_slide', true);
                        this.current_slide_speed = this.flipX ? -200 : 200;
                        this.setVelocityX(this.current_slide_speed)
                        this.scene.tweens.add({ targets: this, current_slide_speed: 0, ease: 'Linear', duration: this.anims.duration});
                        this.flag = 1;
                        this.slide_cooldown = 1;
                        this.scene.time.addEvent({ delay: 500, callback: () => { this.slide_cooldown = 0; } });
                        
                        break;

                    case 1:
                        if (!this.anims.isPlaying)
                            this.change_state("")
                        if (this.body.velocity.x == 0)
                            this.current_slide_speed = 0;
                        else
                        {
                            this.body.velocity.x = this.current_slide_speed;
                            var fade = this.scene.add.image(this.x, this.y, 'hero', this.anims.currentFrame.frame.name).setAlpha(0.1).setTint(0xff0000);
                            fade.flipX = this.flipX;
                            this.scene.tweens.add({ targets: fade, alpha: 0, ease: 'Power1', duration: 250, onComplete: () => { fade.destroy() }});
                        }
                        break;
                }
                break;

            case "Boost":
                switch(this.flag)
                {
                    case 0:
                        this.anims.play('hero_boost', true);
                        this.setVelocityY(-200)
                        this.flag = 1;
                        var effect = this.scene.add.sprite(this.x, this.y, 'fx_ring');
                        effect.on('animationcomplete', () => { effect.destroy() });
                        effect.anims.play("fx_ring");
                        effect.setAngle(this.body.velocity.x == 0 ? 0 : (this.flipX ? -30 : 30));
                        effect.setScale(0.5);
                        effect.setTint(0xff0000);
                        this.scene.tweens.add({ targets: effect, alpha: 0, ease: 'Power1', duration: 250,  }); // duration: 250,
                        break;

                    case 1:
                        if (!this.anims.isPlaying || this.body.onFloor())
                            this.change_state("")
                        break;
                }
                break;

            case "Death":
                if (this.body.onFloor())
                    this.body.velocity.x *= 0.9;
                switch(this.flag)
                {
                    case 0:
                        this.anims.play('hero_defeat', true);
                        this.setVelocityX((this.flipX ? 1 : -1)*125);
                        this.setVelocityY(-100);
                        this.flag = 1;
                        this.death = true;
                        this.scene.cameras.main.flash(500, 255, 0, 0)
                        break;

                    case 1:
                        if (!this.anims.isPlaying)
                        {
                            this.flag = 2;
                            this.scene.cameras.main.once("camerafadeoutcomplete", () => { this.scene.scene.restart(); });
                            this.scene.time.addEvent({  delay: 1000, callback: () => { this.scene.cameras.main.fade(1000, 0, 0, 0);} });
                        }
                        break;
                }
                break;

            default:
                var direction = this.Cursors.right.isDown - this.Cursors.left.isDown;
                this.flag = 0;
                if (this.body.onFloor())
                {
                    this.jump = 2;
                    if(this.keySpace.isPressed && !this.slide_cooldown)
                    {
                        this.change_state("Slide");
                    }
                    else if (this.Z.isPressed)
                    {
                        this.setVelocityY(-200);
                        this.anims.play('hero_up', true);
                    }

                    else if (direction != 0)
                    {
                        this.setVelocityX(direction*75);
                        this.anims.play('hero_walk', true);
                        this.flipX = direction < 0;
                    }
                    else
                    {
                        this.setVelocityX(0);
                        // if (!this.anims.isPlaying ){ // && this.anims.getCurrentKey() != 'hero_idle2'
                        this.anims.play('hero_idle', true);
                        // }
                            
                    }
                }
                else
                {
                    if(this.Z.isPressed && this.jump)
                    {
                        this.jump--;
                        this.change_state("Boost");
                    }
                    else if (direction != 0)
                    {
                        this.setVelocityX(direction*75);
                        this.flipX = direction < 0;
                    }
                    else
                        this.setVelocityX(0);
                    if (this.body.velocity.y > 0)
                            this.anims.play('hero_fall', true);
                    else if (this.body.velocity.y < 0 && this.Z.isUp)
                            this.body.velocity.y *= 0.8;

                    if(this.jump && this.keySpace.isPressed) {
                        this.change_state("Slide");
                        this.setVelocityY(-200);
                    }
                }
                break;
        }
        
        if (this.state == "Slide")
        {
            this.body.setSize(16, 16);
            this.body.offset.y = 16;
        }
        else
        {
            this.body.setSize(16, 24);
            this.body.offset.y = 8;
        }
    }

    isVulnerable()
    {
        if(this.death || this.hurt != 0 || this.state == "Attack3" || this.state == "Boost" || this.state == "Slide" || this.state == "Hurt")
            return false;
        return true;
    }
};