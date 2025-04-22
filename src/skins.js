import React, { useState, useEffect } from "react";
import Papa from "papaparse";

const GolfSkinsAnalyzer = () => {
  const [players, setPlayers] = useState([]);
  const [skinsResults, setSkinsResults] = useState({});
  const [error, setError] = useState(null);
  const [holeHandicaps, setHoleHandicaps] = useState([]);

  // Function to calculate strokes received on each hole using half handicaps
  const calculateStrokesReceived = (halfHandicap, holeHandicap) => {
    // For half handicaps, round appropriately based on hole difficulty
    if (halfHandicap % 1 !== 0) {
      // If half handicap has .5, give stroke if hole handicap is <= rounded half handicap
      return holeHandicap <= Math.ceil(halfHandicap) ? 1 : 0;
    }
    return holeHandicap <= halfHandicap ? 1 : 0;
  };

  // Function to analyze skins from the uploaded data
  const analyzeSkins = (data) => {
    // Find the pars row
    const parsRow = data.find((row) => row[2] === "Pars");

    // Extract player data
    const playerRows = data.filter(
      (row) =>
        row[0] &&
        row[0] !== "Player" &&
        row[0] !== "HDCP" &&
        row[0] !== "PAR" &&
        row[0] !== "" &&
        !row[2]?.includes("Pars")
    );

    // Create player objects with half handicaps
    const playerData = playerRows.map((row) => ({
      name: row[0],
      fullHandicap: parseFloat(row[13]) || 0,
      halfHandicap: (parseFloat(row[13]) || 0) / 2,
      scores: row.slice(3, 12).map((score) => parseInt(score)),
    }));

    setPlayers(playerData);

    // Actual hole handicaps from St. Peters Golf Course
    const actualHoleHandicaps = [4, 14, 16, 2, 18, 8, 6, 12, 10];
    setHoleHandicaps(actualHoleHandicaps);

    // Calculate net scores and determine skins
    const results = {};

    for (let holeIndex = 0; holeIndex < 9; holeIndex++) {
      const holeNumber = holeIndex + 1;
      const holeHandicap = actualHoleHandicaps[holeIndex];

      // Calculate net scores for each player
      const netScores = playerData.map((player) => {
        const strokesReceived = calculateStrokesReceived(
          player.halfHandicap,
          holeHandicap
        );
        const grossScore = player.scores[holeIndex];
        return {
          name: player.name,
          gross: grossScore,
          net: grossScore - strokesReceived,
          strokes: strokesReceived,
        };
      });

      // Find the lowest net score
      const lowestNet = Math.min(...netScores.map((s) => s.net));
      const winners = netScores.filter((s) => s.net === lowestNet);

      if (winners.length === 1) {
        // Single winner
        results[holeNumber] = {
          winner: winners[0].name,
          value: 1,
          scores: netScores,
        };
      } else {
        // Tie - no one wins the skin
        results[holeNumber] = {
          winner: "No Winner",
          value: 0,
          scores: netScores,
        };
      }
    }

    setSkinsResults(results);
  };

  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      Papa.parse(file, {
        complete: (result) => {
          try {
            analyzeSkins(result.data);
          } catch (err) {
            setError("Error parsing file: " + err.message);
          }
        },
        error: (error) => {
          setError("Error reading file: " + error.message);
        },
      });
    }
  };

  // Load the default file
  useEffect(() => {
    const loadDefaultData = async () => {
      try {
        const response = await window.fs.readFile("round_scores 18.csv", {
          encoding: "utf8",
        });
        const result = Papa.parse(response, {
          dynamicTyping: true,
          skipEmptyLines: true,
        });
        analyzeSkins(result.data);
      } catch (err) {
        console.log("No default file found");
      }
    };

    loadDefaultData();
  }, []);

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="mb-6 bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-2">Golf Skins</h1>
        <p className="text-gray-600 mb-4">
          Upload your CSV file or use the default data
        </p>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>

      {Object.keys(skinsResults).length > 0 && (
        <>
          <div className="mb-6 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Skins Results</h2>
            <div className="text-sm text-gray-600 mb-4">
              Hole handicaps:{" "}
              {holeHandicaps.map((h, i) => `Hole ${i + 1}(${h})`).join(", ")}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hole
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      HCP
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Winner
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Value
                    </th>
                    {players.map((player) => (
                      <th
                        key={player.name}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {player.name} ({player.halfHandicap}) [Net]
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(skinsResults).map(([hole, result]) => (
                    <tr key={hole} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {hole}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {holeHandicaps[parseInt(hole) - 1]}
                      </td>
                      <td
                        className={`px-6 py-4 whitespace-nowrap text-sm ${
                          result.winner === "No Winner"
                            ? "text-gray-500"
                            : "text-green-600"
                        }`}
                      >
                        {result.winner}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {result.value}
                      </td>
                      {result.scores.map((score) => (
                        <td
                          key={score.name}
                          className={`px-6 py-4 whitespace-nowrap text-sm ${
                            score.net ===
                            Math.min(...result.scores.map((s) => s.net))
                              ? "font-bold text-blue-600"
                              : "text-gray-500"
                          }`}
                        >
                          {score.net} ({score.gross}
                          {score.strokes > 0 ? `-${score.strokes}` : ""})
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Skins Summary</h2>
            <div className="space-y-2">
              {Object.entries(skinsResults)
                .filter(([_, result]) => result.winner !== "No Winner")
                .map(([hole, result]) => (
                  <div
                    key={hole}
                    className="flex items-center justify-between border-b border-gray-200 py-2"
                  >
                    <div>
                      <span className="font-bold">{result.winner}</span>
                      <span className="text-gray-600"> won on hole {hole}</span>
                    </div>
                    <div className="font-semibold">1 skin</div>
                  </div>
                ))}
            </div>
            <div className="mt-6 pt-4 border-t border-gray-300">
              <h3 className="font-bold text-lg mb-2">Total Skins by Player:</h3>
              {players.map((player) => {
                const skinsWon = Object.values(skinsResults).filter(
                  (result) => result.winner === player.name
                );
                const totalValue = skinsWon.reduce(
                  (sum, skin) => sum + skin.value,
                  0
                );
                if (totalValue > 0) {
                  return (
                    <div key={player.name} className="flex justify-between">
                      <span className="font-semibold">{player.name}</span>
                      <span>
                        {totalValue} {totalValue === 1 ? "skin" : "skins"}
                      </span>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default GolfSkinsAnalyzer;
