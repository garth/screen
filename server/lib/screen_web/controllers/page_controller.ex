defmodule ScreenWeb.PageController do
  use ScreenWeb, :controller

  def home(conn, _params) do
    render(conn, :home)
  end
end
