"use client";
import React, { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * 优化版HoverBorderGradient组件 - 提供高性能的边框渐变效果
 * @param children - 子元素内容
 * @param containerClassName - 容器样式类名
 * @param className - 内容区域样式类名
 * @param as - 渲染的HTML标签，默认为button
 * @param props - 其他HTML属性
 */
export function HoverBorderGradient({
  children,
  containerClassName,
  className,
  as: Tag = "button",
  ...props
}: React.PropsWithChildren<
  {
    as?: React.ElementType;
    containerClassName?: string;
    className?: string;
  } & React.HTMLAttributes<HTMLElement>
>) {
  const [hovered, setHovered] = useState<boolean>(false);

  return (
    <Tag
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "relative group rounded-lg overflow-hidden transition-all duration-300 ease-out",
        "before:absolute before:inset-0 before:rounded-lg before:p-[2px]",
        "before:bg-gradient-to-r before:from-blue-500 before:via-purple-500 before:to-pink-500",
        "before:opacity-0 before:transition-opacity before:duration-300",
        "hover:before:opacity-100",
        "before:animate-spin before:animation-duration-[3s]",
        containerClassName
      )}
      {...props}
    >
      {/* 渐变边框背景 */}
      <div className="absolute inset-[2px] rounded-[6px] bg-white dark:bg-gray-900 transition-colors duration-300" />
      
      {/* 内容区域 */}
      <div
        className={cn(
          "relative z-10 rounded-[6px] transition-all duration-300",
          className
        )}
      >
        {children}
      </div>
    </Tag>
  );
}