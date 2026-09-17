let team;
let enemy;


let selectedPlayerIndex = 0;
let activeEnemyIndex = 0;
let battleOver = false;

const requests = Array.from({length:6}, () => {
    const pokemonID = Math.floor(Math.random() * 1025)+1;
     return fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonID}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }
      return response.json();
    });
});

Promise.all(requests)
  .then((pokemonList) => {
    const simplifiedPokemon = pokemonList.map(createPokemonObject);

    team = simplifiedPokemon.slice(0, 3);
    enemy = simplifiedPokemon.slice(3);

    const teamImages = [
      document.querySelector("#team_image1"),
      document.querySelector("#team_image2"),
      document.querySelector("#team_image3")
    ];
    const teamCaptions = [
      document.querySelector("#team_caption1"),
      document.querySelector("#team_caption2"),
      document.querySelector("#team_caption3")
    ];

    const enemyImages = [
      document.querySelector("#enemy_image1"),
      document.querySelector("#enemy_image2"),
      document.querySelector("#enemy_image3")
    ];
    const enemyCaptions = [
      document.querySelector("#enemy_caption1"),
      document.querySelector("#enemy_caption2"),
      document.querySelector("#enemy_caption3")
    ];

    team.forEach((pokemon, index) => {
      teamImages[index].src = pokemon.sprite;
      teamImages[index].alt = pokemon.name;
      teamCaptions[index].textContent = `${formatPokemonName(pokemon.name)} - ${pokemon.types.join("/")}\nHP: ${pokemon.health}`;
    });

    enemy.forEach((pokemon, index) => {
      enemyImages[index].src = pokemon.sprite;
      enemyImages[index].alt = pokemon.name;
      enemyCaptions[index].textContent = `${formatPokemonName(pokemon.name)} - ${pokemon.types.join("/")}\nHP: ${pokemon.health}`;
    });

    console.log("Player team:", team);
    console.log("Opponent team:", enemy);

    const teamCards = document.querySelectorAll(
      ".player-team .pokemon-card"
    );

    const enemyCards = document.querySelectorAll(
      ".enemy-team .pokemon-card"
    );

    teamCards[0].classList.add("selected");

    teamCards.forEach((card, index) => {
      card.addEventListener("click", () => {
        if (team[index].health <= 0 || battleOver) {
          return;
        }

        teamCards.forEach((otherCard) => {
          otherCard.classList.remove("selected");
        });

        card.classList.add("selected");
        selectedPlayerIndex = index;
      });
    });

    document.querySelector("#attack").addEventListener("click", () => {
      battle(team, enemy, teamCaptions, enemyCaptions, teamCards, enemyCards);
    });

  })
  .catch((error) => {
    console.error("Error fetching Pokemon:", error);
  });

function createPokemonObject(data) {
  const stats = Object.fromEntries(
    data.stats.map((statInfo) => [
      statInfo.stat.name,
      statInfo.base_stat
    ])
  );
  return {
    name: data.name,
    types: data.types.map((typeInfo) => typeInfo.type.name),
    attack: stats.attack,
    defense: stats.defense,
    specialAttack: stats["special-attack"],
    specialDefense: stats["special-defense"],
    speed: stats.speed,
    sprite: data.sprites.front_default,
    health: stats.hp
  };
}

function formatPokemonName(name) {
  return name
    .split("-")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

function battle(team, enemy, teamCaptions, enemyCaptions, teamCards, enemyCards) {
  if (battleOver) {
    return;
  }

  const player = team[selectedPlayerIndex];
  const opponent = enemy[activeEnemyIndex];

  const turnOrder = [
    {
      attacker: player,
      defender: opponent,
      defenderCaption: enemyCaptions[activeEnemyIndex]
    },
    {
      attacker: opponent,
      defender: player,
      defenderCaption: teamCaptions[selectedPlayerIndex]
    }
  ];

  turnOrder.sort((first, second) => {
    return second.attacker.speed - first.attacker.speed;
  });

  for (const turn of turnOrder) {
    if (turn.attacker.health <= 0 || turn.defender.health <= 0) {
      continue;
    }

    const damage = calculateDamage(turn.attacker, turn.defender);

    turn.defender.health = Math.max(
      0,
      turn.defender.health - damage
    );

    updateCaption(turn.defender, turn.defenderCaption);

    addBattleMessage(
      `${formatPokemonName(turn.attacker.name)} dealt ${damage} damage to ` +
      `${formatPokemonName(turn.defender.name)}.`
    );

    if (turn.defender.health === 0) {
      addBattleMessage(
        `${formatPokemonName(turn.defender.name)} fainted!`
      );

      if (turn.defender === opponent) {
        if (!replaceEnemy(enemy, enemyCards)) {
          endBattle("You win!");
        }
      } else {
        teamCards[selectedPlayerIndex].classList.remove("selected");

        const nextPlayerIndex = team.findIndex(
          (pokemon) => pokemon.health > 0
        );

        if (nextPlayerIndex === -1) {
          endBattle("The opponent wins!");
        } else {
          selectPlayer(nextPlayerIndex, teamCards);
        }
      }

      return;
    }
  }
}

function calculateDamage(attacker, defender) {
  let attack;
  let defense;

  if (attacker.attack >= attacker.specialAttack) {
    attack = attacker.attack;
    defense = defender.defense;
  } else {
    attack = attacker.specialAttack;
    defense = defender.specialDefense;
  }
  let damage = Math.max(0, attack - defense);

  for (const attackingType of attacker.types){
    for (const defendingType of defender.types){
      if (super_effective[attackingType].includes(defendingType)){
        damage *= 2;
      } else if (ineffective[attackingType].includes(defendingType)){
        damage /= 2;
      } else if (immune[attackingType].includes(defendingType)){
        damage = 0;
      }
    }
  }
  return Math.max(0, Math.round(damage));
}

function replaceEnemy(enemy, enemyCards){
  const nextEnemyIndex = enemy.findIndex(
    (pokemon, index) => index > activeEnemyIndex && pokemon.health > 0
  );
  if (nextEnemyIndex === -1) {
    return false;
  }
  enemyCards[activeEnemyIndex].classList.remove("active");

  activeEnemyIndex = nextEnemyIndex;
  enemyCards[activeEnemyIndex].classList.add("active");

  addBattleMessage(
    `${formatPokemonName(enemy[activeEnemyIndex].name)} entered the battle!`
  );

  return true;
}

function selectPlayer(index, teamCards) {
  selectedPlayerIndex = index;

  teamCards.forEach((card) => {
    card.classList.remove("selected");
  });

  teamCards[index].classList.add("selected");

  addBattleMessage(
    `${formatPokemonName(team[index].name)} was selected.`
  );
}

function updateCaption(pokemon, caption) {
  caption.textContent = 
    `${formatPokemonName(pokemon.name)} -  ${pokemon.types.join("/")}\n` + 
    `HP: ${pokemon.health}`;
}

function addBattleMessage(message) {
  const battleText = document.querySelector("#battle-text");
  const paragraph = document.createElement("p");

  paragraph.textContent = message;
  battleText.appendChild(paragraph);
  battleText.scrollTop = battleText.scrollHeight;
}

function endBattle(message) {
  battleOver = true;
  document.querySelector('#attack').disabled = true;
  addBattleMessage(message);
}