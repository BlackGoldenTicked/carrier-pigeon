"use client";

import React, { useRef, useState } from "react";
import { cn } from "../../lib/utils";

export interface MovingBorderProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  borderRadius?: string;
  children: React.ReactNode;
  as?: React.ElementType;
  containerClassName?: string;
  borderClassName?: string;
  duration?: number;
  className?: string;
}

/**
 * Moving Border 按钮组件
 * 提供动态移动边框效果，让按钮更加突出和吸引人
 * @param borderRadius - 边框圆角大小
 * @param children - 按钮内容
 * @param as - 渲染的HTML标签，默认为button
 * @param containerClassName - 容器样式类名
 * @param borderClassName - 边框样式类名
 * @param duration - 动画持续时间（毫秒）
 * @param className - 按钮内容样式类名
 * @param props - 其他HTML属性
 */
export function Button({
  borderRadius = "1.75rem",
  children,
  as: Component = "button",
  containerClassName,
  borderClassName,
  duration = 2000,
  className,
  ...otherProps
}: MovingBorderProps) {
  return (
    <Component
      className={cn(
        "bg-transparent relative text-xl h-16 w-40 p-[1px] overflow-hidden",
        containerClassName
      )}
      style={{
        borderRadius: borderRadius,
      }}
      {...otherProps}
    >
      <div
        className="absolute inset-0 rounded-[1.75rem] p-[1px] bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
        style={{
          borderRadius: borderRadius,
        }}
      >
        <div
          className={cn(
            "flex h-full w-full items-center justify-center rounded-[1.75rem] text-sm antialiased font-medium relative z-10",
            className
          )}
          style={{
            borderRadius: `calc(${borderRadius} - 1px)`,
          }}
        >
          {children}
        </div>
      </div>
      
      {/* 移动的边框效果 */}
      <div
        className={cn(
          "absolute inset-0 rounded-[1.75rem] opacity-75",
          borderClassName
        )}
        style={{
          borderRadius: borderRadius,
          background: `
            conic-gradient(
              from 0deg,
              transparent,
              transparent,
              transparent,
              #3b82f6,
              #8b5cf6,
              #ec4899,
              transparent,
              transparent,
              transparent
            )
          `,
          animation: `spin ${duration}ms linear infinite`,
        }}
      />
      
      {/* 内层遮罩 */}
      <div
        className="absolute inset-[2px] rounded-[1.75rem] bg-white dark:bg-slate-900"
        style={{
          borderRadius: `calc(${borderRadius} - 2px)`,
        }}
      />
      
      {/* 按钮内容 */}
      <div
        className={cn(
          "relative z-10 flex h-full w-full items-center justify-center rounded-[1.75rem] text-sm antialiased font-medium",
          className
        )}
        style={{
          borderRadius: `calc(${borderRadius} - 2px)`,
        }}
      >
        {children}
      </div>
    </Component>
  );
}



/**
 * 高级 Moving Border 按钮组件
 * 提供更多自定义选项和动画效果
 */
export function AdvancedMovingBorder({
  borderRadius = "1.75rem",
  children,
  as: Component = "button",
  containerClassName,
  borderClassName,
  duration = 2000,
  className,
  ...otherProps
}: MovingBorderProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <Component
      className={cn(
        "relative overflow-hidden transition-all duration-300 ease-out",
        "hover:scale-110 active:scale-95",
        "transform-gpu", // 启用GPU加速
        containerClassName
      )}
      style={{
        borderRadius: borderRadius,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...otherProps}
    >

      
      {/* 主要动态边框 */}
      <div
        className={cn(
          "absolute inset-0 transition-all duration-300",
          isHovered ? "opacity-100" : "opacity-80",
          borderClassName
        )}
        style={{
          borderRadius: borderRadius,
          background: `
            conic-gradient(
              from 0deg,
              transparent 0deg,
              transparent 40deg,
              #3b82f6 80deg,
              #8b5cf6 140deg,
              #ec4899 200deg,
              #f59e0b 260deg,
              #10b981 320deg,
              transparent 360deg
            )
          `,
          animation: `spin ${isHovered ? duration / 3 : duration / 1.5}ms linear infinite`,
        }}
      />
      
      {/* 内层背景 */}
      <div
        className={cn(
          "absolute inset-[2px] transition-all duration-300",
          "bg-white dark:bg-slate-900"
        )}
        style={{
          borderRadius: `calc(${borderRadius} - 2px)`,
        }}
      />
      

      
      {/* 按钮内容 */}
      <div
        className={cn(
          "relative z-10 flex h-full w-full items-center justify-center",
          "text-sm font-medium transition-all duration-300",
          "px-6 py-3",
          "text-black dark:text-white",
          className
        )}
        style={{
          borderRadius: `calc(${borderRadius} - 2px)`,
        }}
      >
        {children}
      </div>
    </Component>
  );
}