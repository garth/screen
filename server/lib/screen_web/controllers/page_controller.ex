defmodule ScreenWeb.PageController do
  use ScreenWeb, :controller

  def home(conn, _params) do
    render(conn, :home)
  end

  @doc """
  Serves the SPA index.html for any unmatched route.
  This allows client-side routing to work when refreshing or navigating directly to a URL.
  """
  def spa(conn, _params) do
    index_path = Path.join(:code.priv_dir(:screen), "static/index.html")

    if File.exists?(index_path) do
      conn
      |> put_resp_header("content-type", "text/html; charset=utf-8")
      |> send_file(200, index_path)
    else
      conn
      |> put_status(:not_found)
      |> text("Not Found")
    end
  end
end
