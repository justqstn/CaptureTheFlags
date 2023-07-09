// Захват флагов от just_qstn
// v1





// Константы
const FLAG_TARGET = 5,
    WAITING_TIME = 10,
    BUILDING_TIME = 30,
    GAME_TIME = 600,
    END_TIME = 10,
    IMMORTALITY_TIME = 3;
// Переменные
let gameState = Properties.GetContext().Get("game"),
    mainTimer = Timers.GetContext().Get("main"),
    flagState = Properties.GetContext().Get("flag"),
    inv = Inventory.GetContext(),
    redView = AreaViewService.GetContext().Get("red"),
    blueView = AreaViewService.GetContext().Get("blue"),
    captureTrigger = AreaPlayerTriggerService.Get("capture");

// Настройки
Spawns.GetContext().RespawnTime.Value = 10;
inv.Main.Value = false;
inv.Secondary.Value = false;
inv.Explosive.Value = false;
TeamsBalancer.IsAutoBalance = true;
Waiting();

Damage.FriendlyFire = GameMode.Parameters.GetBool("FriendlyFire");
BreackGraph.OnlyPlayerBlocksDmg =
    GameMode.Parameters.GetBool("PartialDesruction");
BreackGraph.WeakBlocks = GameMode.Parameters.GetBool("LoosenBlocks");

// Создание команд
Teams.Add("red", "<B><size=38>К</size><size=28>расные</size>\nрежим от just_qstn</B>", { r: 0.75 });
Teams.Add("blue", "<B><size=38>С</size><size=28>иние</size>\nрежим от just_qstn</B>", { b: 0.75 });
let Red = Teams.Get("red"),
    Blue = Teams.Get("blue");
Red.Spawns.SpawnPointsGroups.Add(2);
Blue.Spawns.SpawnPointsGroups.Add(1);
Red.Properties.Get("flags").Value = 0;
Blue.Properties.Get("flags").Value = 0;
Blue.Build.BlocksSet.Value = BuildBlocksSet.Blue;
Red.Build.BlocksSet.Value = BuildBlocksSet.Red;

// Интерфейс
Ui.GetContext().MainTimerId.Value = mainTimer.Id;

Ui.GetContext().TeamProp1.Value = {
    Team: "red",
    Prop: "flags",
};
Ui.GetContext().TeamProp2.Value = {
    Team: "blue",
    Prop: "flags",
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
        Value: "flag",
        DisplayName: "<B>Флаг</B>",
        ShortDisplayName: "<B>Флаг</B>",
    },
];

LeaderBoard.PlayersWeightGetter.Set(function (p) {
    return p.Properties.Get("Scores").Value;
});

// События
Teams.OnRequestJoinTeam.Add(function (p, t) {
    p.Properties.Get("flag").Value = false;
    t.Add(p);
});

Teams.OnPlayerChangeTeam.Add(function (p) {
    p.Spawns.Spawn();
});

Damage.OnKill.Add(function (p, k) {
    if (p.IdInRoom != k.IdInRoom) {
        p.Properties.Get("combo").Value++;
        p.Properties.Kills.Value++;
        p.Timers.Get("combo").Restart(4);
        p.Properties.Scores.Value += 100 * p.Properties.Get("combo").Value;
    }
});

Damage.OnDeath.Add(function (p) {
    p.Timers.Get("combo").Stop();
    p.Properties.Deaths.Value++;
    if (p.Properties.Get("flag").Value) {
        p.Properties.Get("flag").Value = false;
        if (p.Team == Blue) AreaService.Get("red").Tags.Remove("captured");
        else if (p.Team == Red) AreaService.Get("blue").Tags.Remove("captured");
    }
});

Spawns.OnSpawn.Add(function (p) {
    p.Timers.Get("immor").Restart(IMMORTALITY_TIME);
    p.Properties.Immortality.Value = true;
});

// Зоны
redView.Tags = ["red"];
redView.Color = { r: 1 };
redView.Enable = true;

blueView.Tags = ["blue"];
blueView.Color = { b: 1 };
blueView.Enable = true;

captureTrigger.Tags = ["blue", "red", "captured"];
captureTrigger.Enable = true;
captureTrigger.OnEnter.Add(function (p, a) {
    if (gameState.Value != "game") return;
    if (!a.Tags.Contains(p.Team.Id)) {
        Teams.Get(a.Name).Ui.Hint.Value = "Ваш флаг забрал " + p.NickName;
        p.Team.Ui.Hint.Value = "Флаг противника у вашей команды!";
        if (p.Properties.Get("flag").Value) return;
        p.Properties.Get("flag").Value = true;
        a.Tags.Add("captured");
    } else if (p.Properties.Get("flag").Value && !a.Tags.Contains("captured")) {
        p.Properties.Get("flag").Value = false;
        if (p.Team == Blue) AreaService.Get("red").Tags.Remove("captured");
        else if (p.Team == Red) AreaService.Get("blue").Tags.Remove("captured");
        p.Team.Properties.Get("flags").Value++;
        p.Properties.Scores.Value += 1000;
        Blue.Ui.Hint.Reset();
        Red.Ui.Hint.Reset();
        if (p.Team.Properties.Get("flags").Value >= FLAG_TARGET) End();
    }
});

// Таймеры
mainTimer.OnTimer.Add(function () {
    switch (gameState.Value) {
        case "waiting":
            Building();
            break;
        case "building":
            Game();
            break;
        case "game":
            End();
            break;
        case "end":
            Map.LoadRandomMap();
            break;
    }
});

Timers.OnPlayerTimer.Add(function (t) {
    if (t.Id == "combo") t.Player.Properties.Get("combo").Value = 0;
    else if (t.Id == "immor") t.Player.Properties.Immortality.Value = false;
});

// Функции
function SpawnTeams() {
    let e = Teams.GetEnumerator();
    while (e.moveNext()) {
        e.Current.Spawns.Despawn();
        e.Current.Spawns.Spawn();
    }
}
function Waiting() {
    gameState.Value = "waiting";
    Ui.GetContext().Hint.Value = "Загрузка...";
    mainTimer.Restart(WAITING_TIME);
    Spawns.GetContext().Enable = false;
}

function Building() {
    gameState.Value = "building";
    Ui.GetContext().Hint.Value = "Застраивайте базу!";
    mainTimer.Restart(BUILDING_TIME);
    Spawns.GetContext().Enable = true;
    SpawnTeams();
}

function Game() {
    gameState.Value = "game";
    Ui.GetContext().Hint.Value =
        "Захватывайте чужой флаг и приносите его к себе на базу!";
    mainTimer.Restart(GAME_TIME);
    inv.Main.Value = true;
    inv.Secondary.Value = true;
    inv.Explosive.Value = true;
    SpawnTeams();
}

function End() {
    gameState.Value = "end";
    mainTimer.Restart(END_TIME);
    Spawns.GetContext().Enable = false;
    Spawns.GetContext().Despawn();
    const result = Red.Properties.Get("flags").Value > Blue.Properties.Get("flags").Value ? "Победили <color=red>красные</color>" : Red.Properties.Get("flags").Value < Blue.Properties.Get("flags").Value ? "Победили <color=blue>синие</color>" : "Ничья";
    msg.Show("<B><size=50>" + result + " со счетом <color=red>" + Red.Properties.Get("flags").Value + "</color> : <color=blue>" + Blue.Properties.Get("flags").Value + "</color></size>\n\nрежим Захват флагов\nотjust_qstn</B>", "<B>Игра окончена!</B>");
}
