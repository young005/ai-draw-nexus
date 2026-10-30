/**
 * Mermaid 主题定义（与参考站线上版本保持一致）
 * 主题 id 会持久化在 localStorage 的 ai-draw-nexus.mermaidTheme
 */

export type MermaidThemeId = 'notion' | 'minimal' | 'hand-drawn' | 'material' | 'playful-doodle'

export interface MermaidTheme {
  mermaidConfig: {
    theme: 'default' | 'base' | 'dark' | 'forest' | 'neutral'
    flowchart: Record<string, boolean | string>
    themeVariables: Record<string, string>
    themeCSS?: string
  }
  surfaceStyle?: {
    backgroundColor?: string
    background?: string
    backgroundImage?: string
    backgroundSize?: string
    backgroundPosition?: string
    backgroundRepeat?: string
  }
  injectHandDrawnFilter?: boolean
}

export const MERMAID_THEMES: Record<MermaidThemeId, MermaidTheme> = {
  "notion": {
    "mermaidConfig": {
      "theme": "base",
      "flowchart": {
        "curve": "basis",
        "htmlLabels": true,
        "useMaxWidth": true
      },
      "themeVariables": {
        "background": "#ffffff",
        "primaryColor": "#f1f5f9",
        "primaryTextColor": "#334155",
        "primaryBorderColor": "#cbd5e1",
        "lineColor": "#94a3b8",
        "secondaryColor": "#e2e8f0",
        "tertiaryColor": "#cbd5e1",
        "fontFamily": "-apple-system, BlinkMacSystemFont, \"Segoe UI\", \"Noto Sans SC\", Helvetica, Arial, sans-serif",
        "fontSize": "15px"
      },
      "themeCSS": "\n        .node rect, .node polygon {\n          rx: 4px !important;\n          ry: 4px !important;\n        }\n        .node polygon {\n          stroke-width: 1px;\n        }\n        .node .label {\n          font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", \"Noto Sans SC\", sans-serif;\n        }\n        .edgeLabel {\n          color: #64748b;\n          font-size: 13px;\n        }\n        .actor {\n          fill: #f1f5f9;\n          stroke: #cbd5e1;\n          stroke-width: 1px;\n          rx: 4px !important;\n          ry: 4px !important;\n        }\n        .actor-line {\n          stroke: #94a3b8;\n          stroke-width: 2px;\n        }\n        .activation0, .activation1, .activation2 {\n          fill: #e2e8f0;\n          stroke: #94a3b8;\n          stroke-width: 2px;\n        }\n        .note {\n          fill: #fef3c7;\n          stroke: #fbbf24;\n          stroke-width: 1px;\n          rx: 4px !important;\n          ry: 4px !important;\n        }\n        .noteText {\n          fill: #78350f;\n          font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", \"Noto Sans SC\", sans-serif;\n        }\n        .labelBox {\n          fill: #e2e8f0;\n          stroke: #cbd5e1;\n          stroke-width: 1px;\n          rx: 4px !important;\n          ry: 4px !important;\n        }\n        .labelText, .loopText {\n          fill: #334155;\n          font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", \"Noto Sans SC\", sans-serif;\n          font-weight: 500;\n        }\n        .loopLine {\n          stroke: #cbd5e1;\n          stroke-width: 1px;\n        }\n        .line-plot-0 path { stroke: #6b8cae !important; stroke-width: 3px !important; }\n        .line-plot-1 path { stroke: #73a78d !important; stroke-width: 3px !important; }\n        .line-plot-2 path { stroke: #cb9b7a !important; stroke-width: 3px !important; }\n        .bar-plot-0 rect { fill: #d4e1ee !important; stroke: #6b8cae !important; stroke-width: 1.5px !important; rx: 4px !important; }\n        .bar-plot-1 rect { fill: #d5e8dc !important; stroke: #73a78d !important; stroke-width: 1.5px !important; rx: 4px !important; }\n        .bar-plot-2 rect { fill: #f0e0d6 !important; stroke: #cb9b7a !important; stroke-width: 1.5px !important; rx: 4px !important; }\n        .ticks path { stroke: #e2e8f0 !important; }\n        .left-axis .label text, .bottom-axis .label text { fill: #475569 !important; font-size: 14px !important; }\n        .chart-title text { fill: #334155 !important; font-weight: 600 !important; font-size: 20px !important; }\n        .left-axis .title text, .bottom-axis .title text { fill: #64748b !important; font-size: 16px !important; }\n        .legend text { fill: #475569 !important; font-size: 14px !important; }\n      "
    },
    "surfaceStyle": {
      "backgroundColor": "#ffffff"
    }
  },
  "minimal": {
    "mermaidConfig": {
      "theme": "base",
      "flowchart": {
        "curve": "basis",
        "htmlLabels": true,
        "useMaxWidth": true
      },
      "themeVariables": {
        "background": "#ffffff",
        "primaryColor": "#ffffff",
        "primaryTextColor": "#111111",
        "primaryBorderColor": "#111111",
        "lineColor": "#111111",
        "secondaryColor": "#ffffff",
        "tertiaryColor": "#ffffff",
        "fontFamily": "\"Inter\", \"Noto Sans SC\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
        "fontSize": "14px",
        "mainBkg": "#ffffff",
        "nodeBorder": "#111111",
        "clusterBkg": "#ffffff",
        "clusterBorder": "#111111"
      },
      "themeCSS": "\n        .node rect, .node circle, .node ellipse, .node polygon, .node path {\n          fill: #ffffff;\n          stroke: #111111;\n          stroke-width: 2px;\n        }\n        .edgePath .path {\n          stroke: #111111;\n          stroke-width: 2px;\n        }\n        .cluster rect {\n          fill: #ffffff;\n          stroke: #111111;\n          stroke-width: 2px;\n        }\n        .actor {\n          fill: #ffffff;\n          stroke: #111111;\n          stroke-width: 2px;\n        }\n        .actor-line, .loopLine, .messageLine0, .messageLine1 {\n          stroke: #111111;\n          stroke-width: 2px;\n        }\n        .note, .labelBox {\n          fill: #ffffff;\n          stroke: #111111;\n          stroke-width: 2px;\n        }\n        .arrowheadPath {\n          fill: #111111;\n          stroke: #111111;\n        }\n        .line-plot-0 path { stroke: #2c2c2c !important; stroke-width: 3px !important; }\n        .line-plot-1 path { stroke: #606060 !important; stroke-width: 3px !important; stroke-dasharray: 8 4 !important; }\n        .line-plot-2 path { stroke: #8c8c8c !important; stroke-width: 3px !important; stroke-dasharray: 4 4 !important; }\n        .bar-plot-0 rect { fill: #2c2c2c !important; stroke: #1a1a1a !important; stroke-width: 2px !important; }\n        .bar-plot-1 rect { fill: #606060 !important; stroke: #404040 !important; stroke-width: 2px !important; }\n        .bar-plot-2 rect { fill: #8c8c8c !important; stroke: #707070 !important; stroke-width: 2px !important; }\n        .chart-title text { fill: #111111 !important; font-weight: 700 !important; font-size: 16px !important; }\n        .left-axis .title text, .bottom-axis .title text { fill: #525252 !important; font-size: 13px !important; }\n        .legend text { fill: #111111 !important; font-size: 12px !important; }\n      "
    },
    "surfaceStyle": {
      "backgroundColor": "#ffffff"
    }
  },
  "hand-drawn": {
    "mermaidConfig": {
      "theme": "base",
      "flowchart": {
        "curve": "basis",
        "htmlLabels": true,
        "useMaxWidth": true
      },
      "themeVariables": {
        "background": "#fffef9",
        "primaryColor": "#ffffff",
        "primaryTextColor": "#1a1a1a",
        "primaryBorderColor": "#1a1a1a",
        "lineColor": "#1a1a1a",
        "secondaryColor": "#fff9e6",
        "tertiaryColor": "#ffe8cc",
        "fontFamily": "\"Excalifont\", \"Xiaolai\", cursive",
        "fontSize": "18px"
      },
      "themeCSS": "\n        .titleText, .sectionTitle, .taskText, .legendText, text.actor, .pieTitleText, text.legend {\n          fill: #1a1a1a;\n          font-family: \"Excalifont\", \"Xiaolai\", cursive;\n          font-weight: 600;\n        }\n        .node rect, .node circle, .node polygon {\n          fill: #ffffff;\n          stroke: #1a1a1a;\n          stroke-width: 2.8px;\n          rx: 8px !important;\n          ry: 8px !important;\n          filter: url(#roughen) drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.15));\n        }\n        .node .label,\n        .messageText,\n        .noteText,\n        .labelText,\n        .loopText,\n        .actor text {\n          fill: #1a1a1a;\n          font-family: \"Excalifont\", \"Xiaolai\", cursive;\n          font-weight: 600;\n        }\n        .edgePath .path,\n        .messageLine0,\n        .messageLine1,\n        .loopLine {\n          stroke: #1a1a1a;\n          stroke-width: 2.8px;\n          stroke-linecap: round;\n          stroke-linejoin: round;\n          fill: none;\n          filter: url(#roughen-line);\n        }\n        .actor,\n        .note,\n        .labelBox,\n        .activation0,\n        .activation1,\n        .activation2 {\n          stroke: #1a1a1a;\n          stroke-width: 2.8px;\n          filter: url(#roughen) drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.15));\n        }\n        .actor {\n          fill: #ffffff;\n        }\n        .note {\n          fill: #fffacd;\n        }\n        .labelBox {\n          fill: #ffe8cc;\n        }\n        .activation0, .activation1, .activation2 {\n          fill: #fff9e6;\n        }\n        .actor-line {\n          stroke: #1a1a1a;\n          stroke-width: 2.5px;\n          stroke-dasharray: 8 4 !important;\n          stroke-linecap: round;\n          filter: url(#roughen-line);\n        }\n        .arrowheadPath {\n          fill: #1a1a1a;\n          stroke: #1a1a1a;\n          stroke-width: 2px;\n        }\n        .edgeLabel {\n          background-color: #fffef9 !important;\n          color: #1a1a1a !important;\n          font-family: \"Excalifont\", \"Xiaolai\", cursive;\n          font-size: 16px;\n          font-weight: 600;\n        }\n        .line-plot-0 path { stroke: #1a1a1a !important; stroke-width: 3px !important; filter: url(#roughen-line); }\n        .line-plot-1 path { stroke: #5d6d7e !important; stroke-width: 3px !important; filter: url(#roughen-line); }\n        .bar-plot-0 rect { fill: #fff9e6 !important; stroke: #1a1a1a !important; stroke-width: 2.5px !important; filter: url(#roughen); }\n        .bar-plot-1 rect { fill: #ffe8cc !important; stroke: #1a1a1a !important; stroke-width: 2.5px !important; filter: url(#roughen); }\n      "
    },
    "surfaceStyle": {
      "backgroundColor": "#fffef9",
      "backgroundImage": "radial-gradient(circle at 2px 2px, rgba(26, 26, 26, 0.03) 1px, transparent 1px)",
      "backgroundSize": "30px 30px"
    },
    "injectHandDrawnFilter": true
  },
  "material": {
    "mermaidConfig": {
      "theme": "base",
      "flowchart": {
        "curve": "basis",
        "htmlLabels": true,
        "useMaxWidth": true
      },
      "themeVariables": {
        "background": "#ffffff",
        "primaryColor": "#ffffff",
        "primaryTextColor": "rgba(0, 0, 0, 0.87)",
        "primaryBorderColor": "#e0e0e0",
        "lineColor": "#757575",
        "secondaryColor": "#ffffff",
        "tertiaryColor": "#ffffff",
        "fontFamily": "\"Roboto\", \"Noto Sans SC\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
        "fontSize": "14px"
      },
      "themeCSS": "\n        .node rect, .node circle, .node polygon {\n          fill: #ffffff;\n          stroke: none;\n          rx: 4px !important;\n          ry: 4px !important;\n          filter:\n            drop-shadow(0 1px 3px rgba(0, 0, 0, 0.12))\n            drop-shadow(0 1px 2px rgba(0, 0, 0, 0.24));\n        }\n        .node .label,\n        .messageText,\n        .noteText,\n        .labelText,\n        .loopText,\n        .actor text {\n          font-family: \"Roboto\", \"Noto Sans SC\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif;\n          font-weight: 500;\n          fill: rgba(0, 0, 0, 0.87);\n        }\n        .edgePath .path,\n        .messageLine0,\n        .messageLine1 {\n          stroke: #757575;\n          stroke-width: 2px;\n          stroke-linecap: round;\n        }\n        .arrowheadPath {\n          fill: #757575;\n          stroke: #757575;\n        }\n        .actor,\n        .activation0,\n        .activation1,\n        .activation2,\n        .note,\n        .labelBox {\n          fill: #ffffff;\n          stroke: none;\n          rx: 4px !important;\n          ry: 4px !important;\n          filter:\n            drop-shadow(0 1px 3px rgba(0, 0, 0, 0.12))\n            drop-shadow(0 1px 2px rgba(0, 0, 0, 0.24)) !important;\n        }\n        .actor-line,\n        .loopLine {\n          stroke: #bdbdbd;\n          stroke-width: 2px;\n          stroke-dasharray: 4 4 !important;\n        }\n        .cluster rect {\n          fill: #ffffff;\n          stroke: #e0e0e0;\n          stroke-width: 1px;\n          rx: 8px !important;\n          ry: 8px !important;\n          filter:\n            drop-shadow(0 1px 3px rgba(0, 0, 0, 0.08))\n            drop-shadow(0 1px 2px rgba(0, 0, 0, 0.16));\n        }\n        .line-plot-0 path { stroke: #6200ee !important; stroke-width: 3px !important; }\n        .line-plot-1 path { stroke: #03dac6 !important; stroke-width: 3px !important; }\n        .bar-plot-0 rect { fill: rgba(98, 0, 238, 0.18) !important; stroke: #6200ee !important; stroke-width: 1.5px !important; rx: 4px !important; }\n        .bar-plot-1 rect { fill: rgba(3, 218, 198, 0.18) !important; stroke: #03dac6 !important; stroke-width: 1.5px !important; rx: 4px !important; }\n        .chart-title text { fill: rgba(0, 0, 0, 0.87) !important; font-weight: 600 !important; font-size: 18px !important; }\n      "
    },
    "surfaceStyle": {
      "backgroundColor": "#ffffff"
    }
  },
  "playful-doodle": {
    "mermaidConfig": {
      "theme": "base",
      "flowchart": {
        "curve": "basis",
        "htmlLabels": true,
        "useMaxWidth": true
      },
      "themeVariables": {
        "background": "#ffeef8",
        "primaryColor": "#ffdff6",
        "primaryTextColor": "#000000",
        "primaryBorderColor": "#000000",
        "lineColor": "#000000",
        "secondaryColor": "#dff4ff",
        "tertiaryColor": "#f0e7ff",
        "fontFamily": "\"Comic Neue\", \"Comic Sans MS\", \"Noto Sans SC\", cursive, sans-serif",
        "fontSize": "15px"
      },
      "themeCSS": "\n        .node rect, .node polygon {\n          fill: #ffdff6;\n          stroke: #000000;\n          stroke-width: 3px;\n          rx: 20px !important;\n          ry: 20px !important;\n          filter: drop-shadow(4px 4px 0 rgba(0, 0, 0, 0.2));\n        }\n        .node circle {\n          fill: #dff4ff;\n          stroke: #000000;\n          stroke-width: 3px;\n          filter: drop-shadow(3px 3px 0 rgba(0, 0, 0, 0.15));\n        }\n        .node .label,\n        .messageText,\n        .noteText,\n        .labelText,\n        .loopText,\n        .actor text {\n          font-family: \"Comic Neue\", \"Comic Sans MS\", \"Noto Sans SC\", cursive, sans-serif;\n          font-weight: 700;\n          fill: #000000;\n        }\n        .node:nth-child(2n) rect,\n        .node:nth-child(2n) polygon,\n        .node:nth-child(2n) circle {\n          fill: #dff4ff;\n        }\n        .node:nth-child(3n) rect,\n        .node:nth-child(3n) polygon,\n        .node:nth-child(3n) circle {\n          fill: #f0e7ff;\n        }\n        .edgePath .path,\n        .messageLine0,\n        .messageLine1 {\n          stroke: #000000;\n          stroke-width: 3px;\n          stroke-linecap: round;\n          stroke-linejoin: round;\n        }\n        .arrowheadPath {\n          fill: #000000;\n          stroke: #000000;\n          stroke-width: 2px;\n        }\n        .edgeLabel rect {\n          fill: #ffffff;\n          stroke: #000000;\n          stroke-width: 2px;\n          rx: 12px !important;\n          filter: drop-shadow(2px 2px 0 rgba(0, 0, 0, 0.1));\n        }\n        .actor,\n        .note,\n        .labelBox,\n        .activation0,\n        .activation1,\n        .activation2 {\n          stroke: #000000;\n          stroke-width: 3px;\n          filter: drop-shadow(4px 4px 0 rgba(0, 0, 0, 0.2));\n        }\n        .actor {\n          fill: #ffdff6;\n          rx: 20px !important;\n          ry: 20px !important;\n        }\n        .note {\n          fill: #fff4e6;\n          rx: 15px !important;\n          ry: 15px !important;\n        }\n        .labelBox,\n        .activation0,\n        .activation1,\n        .activation2 {\n          fill: #f0e7ff;\n          rx: 15px !important;\n          ry: 15px !important;\n        }\n        .actor-line,\n        .loopLine {\n          stroke: #000000;\n          stroke-width: 2px;\n          stroke-dasharray: 6 3 !important;\n        }\n        .line-plot-0 path { stroke: #9333ea !important; stroke-width: 4px !important; }\n        .line-plot-1 path { stroke: #ec4899 !important; stroke-width: 4px !important; }\n        .bar-plot-0 rect { fill: #ffdff6 !important; stroke: #000000 !important; stroke-width: 3px !important; rx: 12px !important; }\n        .bar-plot-1 rect { fill: #dff4ff !important; stroke: #000000 !important; stroke-width: 3px !important; rx: 12px !important; }\n        .chart-title text { fill: #000000 !important; font-weight: 800 !important; font-size: 20px !important; }\n      "
    },
    "surfaceStyle": {
      "background": "linear-gradient(135deg, #ffeef8 0%, #e0f7ff 100%)",
      "backgroundColor": "#ffeef8"
    }
  }
}

export const DEFAULT_MERMAID_THEME: MermaidThemeId = 'notion'

export const MERMAID_THEME_IDS = Object.keys(MERMAID_THEMES) as MermaidThemeId[]

export const MERMAID_THEME_STORAGE_KEY = 'ai-draw-nexus.mermaidTheme'
