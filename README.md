# CSP Visualizer
A web-based interactive visualization tool for understanding Constraint Satisfaction Problems (CSPs).

This project currently allows users to walk through the solving process for two CSPs: Map Coloring and the N-Queens Problem. Users can choose different solving methods and heuristics (MRV, LCV, Forward Checking) to see how search and backtracking unfold step-by-step.

----------------------------------------------------------------------------------------------------------------

## Usage Guide
1. Open the page at https://rachael-p.github.io/ai-final/.
2. Select the CSP problem type you want to visualize:
    - Map Coloring: Regions connected by edges must be colored differently.
    - N-Queens: Queens placed on a chessboard must not be able to attack each other.
3. Choose solving settings:
    - Solving Method (pure backtracking or with forward checking)
    - Enable/disable MRV and LCV
4. Click "Start Visualization" to begin.
5. Click "Next Step" to progress through the solver’s decisions.
6. When the solution is found, a Restart button will appear to allow resetting.

----------------------------------------------------------------------------------------------------------------

## Notes
Currently, the visualizations only include two hard-coded CSPs, but future work can include more options and/or allow users to change parameters (ex. number of nodes, size of board, customized domains). In addition, I currently use just the basic HTML UI elements, but UI libraries can be incorporated in the future for a more polished look. 

----------------------------------------------------------------------------------------------------------------

Created by Rachael Pei