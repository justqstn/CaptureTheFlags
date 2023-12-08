try
{
  // Захват Флагов





// Константы
const STATE_START = 0, STATE_BUILDUNG = 1, STATE_GAME = 2, STATE_END = 3;

// Переменные
let inv = Inventory.GetContext(), main_timer = Timers.GetContext().Get("main"), state = Properties.GetContext().Get("state");

// Настройки

// Функции примитивов
Boolean.prototype.to_string = function()
{
  if (this == true) return "✔";
  else return " ";
}

Spawns.GetContext().RespawnTime.Value = 10;
inv.Main.Value = false;
inv.Secondary.Value = false;
inv.Explosive.Value = false;
inv.Build.Value = GameMode.Parameters.GetBool("building");
TeamsBalancer.IsAutoBalance = true;
Spawns.GetContext().Enable = false;

add_area({name: "blue", view: true, color: {b: 0.75}, tags: ["blue", "blue_flag"]});
add_area({name: "red", view: true, color: {r: 0.75}, tags: ["red", "red_flag"]});

add_area({name: "capture", view: false, trigger: true, tags: ["captured", "red", "blue"], enter: t_capture});
add_area({name: "flag", view: false, trigger: true, tags: ["red_flag", "blue_flag"], enter: t_pickup});


Damage.FriendlyFire = GameMode.Parameters.GetBool("FriendlyFire");
BreackGraph.OnlyPlayerBlocksDmg =
  GameMode.Parameters.GetBool("PartialDesruction");
BreackGraph.WeakBlocks = GameMode.Parameters.GetBool("LoosenBlocks");

// Создание команд
Teams.Add("red", "<B><size=34>К</size><size=28>расные</size>\nрежим от just_qstn</B>", { r: 0.75 });
Teams.Add("blue", "<B><size=34>С</size><size=28>иние</size>\nрежим от just_qstn</B>", { b: 0.75 });

let red_team = Teams.Get("red"), blue_team = Teams.Get("blue");

red_team.Spawns.SpawnPointsGroups.Add(2);
blue_team.Spawns.SpawnPointsGroups.Add(1);

red_team.Build.BlocksSet.Value = BuildBlocksSet.Blue;
blue_team.Build.BlocksSet.Value = BuildBlocksSet.Red;

// Интерфейс
Ui.GetContext().MainTimerId.Value = main_timer.Id;

Ui.GetContext().TeamProp1.Value = {
  Team: "red",
  Prop: "hint",
};
Ui.GetContext().TeamProp2.Value = {
  Team: "blue",
  Prop: "hint",
};

LeaderBoard.PlayerLeaderBoardValues = [
  {
    Value: "Kills",
    DisplayName: "<B>Киллы</B>",
    ShortDisplayName: "<B>Киллы</B>",
  },
  {
    Value: "Deaths",
    DisplayName: "<B>Смерти</B>",
    ShortDisplayName: "<B>Смерти</B>",
  },
  {
    Value: "Scores",
    DisplayName: "<B>Очки</B>",
    ShortDisplayName: "<B>Очки</B>",
  },
  {
    Value: "_flag",
    DisplayName: "<B>Флаг</B>",
    ShortDisplayName: "<B>Флаг</B>",
  },
];

LeaderBoard.PlayersWeightGetter.Set(function (p) {
  return p.Properties.Get("Scores").Value;
});

// События
Teams.OnAddTeam.Add(function (t) {
  t.Properties.Get("flags").Value = 0;
  t.Properties.Get("flag_state").Value = "на базе";
  AreaService.Get(t.Id + "_flag").Tags.Add(t.Id + "_flag");
});

Teams.OnRequestJoinTeam.Add(function (p, t) {
  p.Properties.Get("flag").Value = false;
  p.Properties.Get("_flag").Value = (false).to_string();
  t.Add(p);
});

Properties.OnTeamProperty.Add(function(c, v) {
	if (v.Name != "hint") {
		c.Team.Properties.Get("hint").Value = "< Флаги: " + c.Team.Properties.Get("flags").Value + " >\n\n< Флаг: " + c.Team.Properties.Get("flag_state").Value + " >";
	}
});

Teams.OnPlayerChangeTeam.Add(function (p) {
  p.Spawns.Spawn();
});

Damage.OnKill.Add(function (p, k)
{
  if (p.IdInRoom != k.IdInRoom)   
  {
    p.Properties.Kills.Value++;
    p.Properties.Scores.Value += 250;
  }
  if (k.Properties.Get("flag").Value) 
  {
    if (p) p.Properties.Scores += 250;
    k.Properties.Deaths.Value++;
    AreaService.Get(p.Team.Id + "_flag").Ranges.Add({Start: k.PositionIndex, End: {x: k.PositionIndex.x + 1, y: k.PositionIndex.y + 4, z: k.PositionIndex.z + 1}});
    p.Team.Properties.Get("flag_state").Value = "потерян";
    p.Ui.GetContext().Hint.Value = k.NickName + " потерял ваш флаг";
    k.Ui.GetContext().Hint.Value = k.NickName + " потерял флаг соперника";
  }
});

// Таймеры
main_timer.OnTimer.Add(function(){
  switch(state.Value)
  {
    case 0:
      building(); break;
    case 1:
      game(); break;
    case 2:
      end(); break
    case 3:
      Game.RestartGame(); break;
  }
});

// Функции
function spawn_teams()
{
  Spawns.GetContext().Enable = true;
  red_team.Spawns.Despawn();
  blue_team.Spawns.Despawn();
  red_team.Spawns.Spawn();
  blue_team.Spawns.Spawn();
}

function add_area(params)
{
  if (params.view != null)
  {
    let v = AreaViewService.GetContext().Get(params.name);
    v.Color = params.color;
    v.Tags = params.tags;
    v.Enable = params.view;
  }

  if (params.trigger != null)
  {
    let t = AreaPlayerTriggerService.Get(params.name);
    t.Tags = params.tags;
    t.Enable = params.trigger;
    if (params.enter) t.OnEnter.Add(params.enter);
    if (params.exit) t.OnExit.Add(params.exit);
  }
  //return { Trigger: t, View: t };
}

function get_opposing_team(team)
{
  if (team == red_team) return blue_team;
  else return red_team;
}

function t_capture(p, a)
{
  let rival_team = get_opposing_team(p.Team);
  if (a.Tags.Contains(p.Team.Id))
  {
    if (a.Tags.Contains("captured")) return;

    if (p.Properties.Get("flag").Value)
    {
      p.Properties.Scores.Value += 1500;
      p.Properties.Get("flag").Value = false;
      p.Properties.Get("_flag").Value = (false).to_string();

      AreaService.Get(rival_team.Id).Tags.Remove("captured");

      rival_team.Ui.Hint.Value = p.NickName + " принес ваш флаг себе на базу";
      p.Team.Ui.Hint.Value = p.NickName + " принес флаг на базу";

      rival_team.Properties.Get("flag_state").Value = "на базе";

      p.Team.Properties.Get("flags").Value++;
      //if (p.Team.Properties.Get("flags").Value >= 5) return; 
    }
  }
  else
  {
    if (p.Properties.Get("flag").Value) return;

    p.Properties.Get("flag").Value = true;
    p.Properties.Get("_flag").Value = (true).to_string();

    a.Tags.Add("captured");

    rival_team.Properties.Get("flag_state").Value = "у " + p.NickName;

    p.Ui.Hint.Value = p.NickName + " захватил флаг противника";
    rival_team.Team.Ui.Hint.Value = p.NickName + " захватил фаш флаг";
  }
}

function t_pickup(p, a)
{
  let rival_team = get_opposing_team(p.Team);
  if (a.Tags.Contains(p.Team.Id))
  {
    p.Properties.Scores.Value += 700;

    rival_team.Ui.Hint.Value = p.NickName + " вернул флаг на свою базу";
    p.Team.Ui.Hint.Value = p.NickName + " вернул флаг на базу";

    rival_team.Properties.Get("flag_state").Value = "на базе";

    AreaService.Get(p.Team.Id).Tags.Remove("captured");
  }
  else
  {
    p.Properties.Get("flag").Value = true;

    p.Ui.Hint.Value = p.NickName + " подобрал флаг противника";
    rival_team.Team.Ui.Hint.Value = p.NickName + " подобрал ваш флаг";

    rival_team.Properties.Get("flag_state").Value = "у " + p.NickName;
  }
  a.Ranges.Clear();
}

function start()
{
  state.Value = STATE_START;

  Ui.GetContext().Hint.Value = "Загрузка карты...";

  main_timer.Restart(10);
}

function building()
{
  state.Value = STATE_BUILDUNG;

  Ui.GetContext().Hint.Value = "Стройтесь!";

  spawn_teams();

  main_timer.Restart(30);
}

function game()
{
  state.Value = STATE_GAME;

  Ui.GetContext().Hint.Value = "Захватывайте чужой флаг и несите его в зону на базе!";

  spawn_teams();

  inv.Main.Value = true;
  inv.Explosive.Value = true;
  inv.Secondary.Value = true;

  main_timer.Restart(600);
}

function end()
{
  state.Value = STATE_END;

  Spawns.GetContext().Despawn();
  Game.GameOver(LeaderBoard.GetTeams());
  main_timer.Restart(10);
}

start();

} catch(e) { Validate.ReportInvalid(e.name + " " + e.message); }
